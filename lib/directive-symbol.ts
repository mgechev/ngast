import {Program} from 'typescript';
import {resolveForwardRef, SchemaMetadata} from '@angular/core';
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
  CompilePipeSummary
} from '@angular/compiler';

import {ProjectSymbols} from './project-symbols';
import {Symbol} from './symbol';
import {ResourceResolver} from './resource-resolver';

import {parseCss} from './css-parser/parseCss';

interface DirectiveContext {
  directives: CompileDirectiveSummary[];
  pipes: CompilePipeSummary[];
  schemas: SchemaMetadata[];
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
    private projectSymbols: ProjectSymbols) {
      super(program, symbol);
    }

  getNonResolvedMetadata() {
    return this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
  }

  // TODO: use the normalizer's cache in order to prevent repetative I/O operations
  getResolvedMetadata() {
    const metadata = this.getNonResolvedMetadata();
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
    currentMetadata.template = this.resourceResolver.getSync(templateMetadata.templateUrl);
    currentMetadata.styles = currentMetadata.styles.concat(currentMetadata.styleUrls.map(path =>
      this.resourceResolver.getSync(path)));
    return currentMetadata;
  }

  getModule() {
    return this.projectSymbols
      .getAnalyzedModules().ngModuleByPipeOrDirective.get(this.symbol);
  }

  getStyleAsts() {
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

  getTemplateAst() {
    let result: any;
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
            expressionParser, new DomElementSchemaRegistry(), htmlParser, null, []);
        const htmlResult = htmlParser.parse(source, '');
        let errors: any[] = undefined;
        const { directives, pipes, schemas } = this.getDirectiveContext();
        const parseResult = parser.tryParseHtml(
            htmlResult, metadata, source, directives, pipes, schemas, '');
        result = {
          htmlAst: htmlResult.rootNodes,
          templateAst: parseResult.templateAst,
          directive: metadata, directives, pipes,
          parseErrors: parseResult.errors, expressionParser, errors
        };
      }
    } catch (e) {
      result = {errors: [{ message: e.message}]};
    }
    return result;
  }

  isComponent() {
    return !!this.getResolvedMetadata().template;
  }
}
