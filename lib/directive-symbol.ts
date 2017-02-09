import {Program} from 'typescript';
import {resolveForwardRef, SchemaMetadata, Directive} from '@angular/core';
import {
  StaticSymbol,
  DirectiveResolver,
  CompileMetadataResolver,
  componentModuleUrl,
  StaticReflector,
  UrlResolver,
  HtmlParser,
  I18NHtmlParser,
  Lexer,
  Parser,
  TemplateParser,
  DomElementSchemaRegistry,
  DirectiveNormalizer,
  CompileDirectiveSummary,
  CompilePipeSummary,
  CompileNgModuleMetadata,
  CompileTemplateMetadata,
  CompileDirectiveMetadata,
  TemplateAst,
  ParseError
} from '@angular/compiler';

import {ContextSymbols} from './context-symbols';
import {Symbol} from './symbol';
import {ResourceResolver} from './resource-resolver';

import {CssAst} from './css-parser/css-ast';
import {parseCss} from './css-parser/parse-css';

export interface DirectiveContext {
  directives: CompileDirectiveSummary[];
  pipes: CompilePipeSummary[];
  schemas: SchemaMetadata[];
}

export interface TemplateAstResult {
  htmlAst?: any[];
  templateAst?: TemplateAst[];
  directive?: CompileDirectiveMetadata;
  parseErrors?: ParseError[];
  errors?: {message: string}[];
}

export class DirectiveSymbol extends Symbol {
  private urlResolver = new UrlResolver();

  constructor(
    program: Program,
    symbol: StaticSymbol,
    private metadataResolver: CompileMetadataResolver,
    private directiveNormalizer: DirectiveNormalizer,
    private resolver: DirectiveResolver,
    private reflector: StaticReflector,
    private resourceResolver: ResourceResolver,
    private projectSymbols: ContextSymbols) {
      super(program, symbol);
    }

  getNonResolvedMetadata(): CompileDirectiveMetadata {
    return this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol).metadata;
  }

  // TODO: use the normalizer's cache in order to prevent repetative I/O operations
  getResolvedMetadata(): CompileTemplateMetadata {
    const metadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
    const componentType = resolveForwardRef(this.symbol);
    const componentUrl = componentModuleUrl(this.reflector, componentType, metadata);
    const templateMetadata = metadata.metadata.template;
    // Required because otherwise the normalizer gets confused.
    if (!templateMetadata.template) {
      templateMetadata.templateUrl = this.urlResolver.resolve(componentUrl, templateMetadata.templateUrl);
      templateMetadata.template = this.resourceResolver.getSync(templateMetadata.templateUrl);
    }
    const currentMetadata = this.directiveNormalizer.normalizeTemplateSync(Object.assign(templateMetadata, {
      moduleUrl: componentUrl,
      componentType
    }));
    if (templateMetadata.templateUrl) {
      currentMetadata.template = this.resourceResolver.getSync(templateMetadata.templateUrl);
      currentMetadata.templateUrl = templateMetadata.templateUrl;
    }
    currentMetadata.styles = currentMetadata.styles.concat(currentMetadata.styleUrls.map(path =>
      this.resourceResolver.getSync(path)));
    return currentMetadata;
  }

  getModule(): CompileNgModuleMetadata | undefined {
    return this.projectSymbols
      .getAnalyzedModules().ngModuleByPipeOrDirective.get(this.symbol);
  }

  getStyleAsts(): CssAst[] {
    return this.getResolvedMetadata()
      .styles.map(s => parseCss(s));
  }

  getDirectiveContext(): DirectiveContext {
    const analyzedModules = this.projectSymbols.getAnalyzedModules();
    let ngModule = analyzedModules.ngModuleByPipeOrDirective.get(this.symbol);
    if (!ngModule) {
      throw new Error('Cannot find module associated with the directive ' + this.symbol.name);
    }
    const resolvedDirectives = ngModule.transitiveModule.directives.map(
        d => this.metadataResolver.getNonNormalizedDirectiveMetadata(d.reference));
    const directives =
        resolvedDirectives.filter(d => d !== null).map(d => d.metadata.toSummary());
    const pipes = ngModule.transitiveModule.pipes.map(
        p => this.metadataResolver.getOrLoadPipeMetadata(p.reference).toSummary());
    const schemas = ngModule.schemas;
    return {
      pipes, directives, schemas
    };
  }

  getTemplateAst(): TemplateAstResult {
    let result: TemplateAstResult;
    try {
      const resolvedMetadata =
          this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol as any);
      const dirMetadata = this.getResolvedMetadata();
      const source = dirMetadata.template;
      const metadata = resolvedMetadata && resolvedMetadata.metadata;
      if (metadata) {
        const rawHtmlParser = new HtmlParser();
        const htmlParser = new I18NHtmlParser(rawHtmlParser);
        const expressionParser = new Parser(new Lexer());
        const parser = new TemplateParser(
            expressionParser, new DomElementSchemaRegistry(), htmlParser, undefined, []);
        const htmlResult = htmlParser.parse(source, '');
        const { directives, pipes, schemas } = this.getDirectiveContext();
        const parseResult = parser.tryParseHtml(
            htmlResult, metadata, source, directives, pipes, schemas, '');
        result = {
          htmlAst: htmlResult.rootNodes,
          templateAst: parseResult.templateAst,
          directive: metadata,
          parseErrors: parseResult.errors,
          errors: []
        };
      } else {
        result = { errors: [ {message: 'Cannot find metadata for the directive'} ] };
      }
    } catch (e) {
      result = {errors: [{ message: e.message}]};
    }
    return result;
  }

  isComponent(): boolean {
    return !!this.getResolvedMetadata().template;
  }
}
