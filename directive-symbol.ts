import {resolveForwardRef} from '@angular/core';
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
  DirectiveNormalizer
} from '@angular/compiler';

import {ProjectSymbols} from './project-symbols';

import {Symbol} from './symbol';

import {ResourceResolver} from './resource-resolver';

export class DirectiveSymbol extends Symbol {
  private urlResolver = new UrlResolver();

  constructor(
    symbol: StaticSymbol,
    private metadataResolver: CompileMetadataResolver,
    private directiveNormalizer: DirectiveNormalizer,
    private resolver: DirectiveResolver,
    private reflector: StaticReflector,
    private resourceResolver: ResourceResolver<string>,
    private projectSymbols: ProjectSymbols) {
      super(symbol);
    }

  getMetadata() {
    const metadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
    const componentType = resolveForwardRef(this.symbol);
    const componentUrl = componentModuleUrl(this.reflector, componentType, metadata);
    const templateMetadata = metadata.metadata.template;
    // Required because otherwise the normalizer gets confused.
    if (!templateMetadata.template) {
      templateMetadata.templateUrl = this.urlResolver.resolve(componentUrl, templateMetadata.templateUrl);
      templateMetadata.template = this.resourceResolver.resolveSync(templateMetadata.templateUrl);
    }
    const currentMetadata = this.directiveNormalizer.normalizeTemplateSync(Object.assign(templateMetadata, {
      moduleUrl: componentUrl,
      componentType
    }));
    currentMetadata.template = this.resourceResolver.resolveSync(templateMetadata.templateUrl);
    currentMetadata.styles = currentMetadata.styles.concat(currentMetadata.styleUrls.map(path =>
      this.resourceResolver.resolveSync(path)));
    return currentMetadata;
  }

  getModule() {
    return this.projectSymbols
      .getAnalyzedModules().ngModuleByPipeOrDirective.get(this.symbol);
  }

  getAst() {
    let result: any;
    try {
      const resolvedMetadata =
          this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol as any);
      const dirMetadata = this.getMetadata();
      const source = dirMetadata.template;
      const metadata = resolvedMetadata && resolvedMetadata.metadata;
      if (metadata) {
        const rawHtmlParser = new HtmlParser();
        const htmlParser = new I18NHtmlParser(rawHtmlParser);
        const expressionParser = new Parser(new Lexer());
        const parser = new TemplateParser(
            expressionParser, new DomElementSchemaRegistry(), htmlParser, null, []);
        const htmlResult = htmlParser.parse(source, '');
        const analyzedModules = this.projectSymbols.getAnalyzedModules();
        let errors: any[] = undefined;
        let ngModule = analyzedModules.ngModuleByPipeOrDirective.get(this.symbol);
        if (!ngModule) {
          throw new Error('Cannot find module associated with the directive ' + this.symbol.name);
        }
        if (ngModule) {
          const resolvedDirectives = ngModule.transitiveModule.directives.map(
              d => this.metadataResolver.getNonNormalizedDirectiveMetadata(d.reference));
          const directives =
              resolvedDirectives.filter(d => d !== null).map(d => d.metadata.toSummary());
          const pipes = ngModule.transitiveModule.pipes.map(
              p => this.metadataResolver.getOrLoadPipeMetadata(p.reference).toSummary());
          const schemas = ngModule.schemas;
          const parseResult = parser.tryParseHtml(
              htmlResult, metadata, source, directives, pipes, schemas, '');
          result = {
            htmlAst: htmlResult.rootNodes,
            templateAst: parseResult.templateAst,
            directive: metadata, directives, pipes,
            parseErrors: parseResult.errors, expressionParser, errors
          };
        }
      }
    } catch (e) {
      result = {errors: [{ message: e.message}]};
    }
    return result;
  }

  isComponent() {
    return !!this.getMetadata().template;
  }
}
