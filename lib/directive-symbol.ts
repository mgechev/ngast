import {Program} from 'typescript';
import {SchemaMetadata, resolveForwardRef} from '@angular/core';
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
  CompilerConfig,
  ParseError
} from '@angular/compiler';

import {ContextSymbols} from './context-symbols';
import { Symbol } from './symbol';
import {ResourceResolver} from './resource-resolver';

import {CssAst} from './css-parser/css-ast';
import {parseCss} from './css-parser/parse-css';
import { ProviderSymbol } from './provider-symbol';
import { ProviderMeta } from '@angular/compiler';

/**
 * The context into which the template of given
 * directive will be compiled.
 *
 * @export
 * @interface DirectiveContext
 */
export interface DirectiveContext {

  /**
   * The directives that are available for the compilation
   * of the compilation of given template.
   *
   * @type {CompileDirectiveSummary[]}
   * @memberOf DirectiveContext
   */
  directives: CompileDirectiveSummary[];

  /**
   * The pipes which are available for the compilation
   * of the template of given target component.
   *
   * @type {CompilePipeSummary[]}
   * @memberOf DirectiveContext
   */
  pipes: CompilePipeSummary[];

  /**
   * The schemas that are used for the compilation of the template
   * of given component.
   *
   * @type {SchemaMetadata[]}
   * @memberOf DirectiveContext
   */
  schemas: SchemaMetadata[];
}


/**
 * The result of the compilation of the template of given component.
 *
 * @export
 * @interface TemplateAstResult
 */
export interface TemplateAstResult {

  /**
   * The root template nodes.
   *
   * @type {TemplateAst[]}
   * @memberOf TemplateAstResult
   */
  templateAst?: TemplateAst[];

  /**
   * All the parse errors.
   *
   * @type {ParseError[]}
   * @memberOf TemplateAstResult
   */
  parseErrors?: ParseError[];

  /**
   * Non-parse errors occured during compilation.
   *
   * @type {{message: string}[]}
   * @memberOf TemplateAstResult
   */
  errors?: {message: string}[];
}


/**
 * This class represents the individual directives and wrapps
 * their `StaticSymbol`s produced by the `@angular/compiler`.
 * 
 * @export
 * @class DirectiveSymbol
 * @extends {Symbol}
 */
export class DirectiveSymbol extends Symbol {
  private urlResolver = new UrlResolver();


  /**
   * Creates an instance of DirectiveSymbol.
   * 
   * @param {Program} program
   * @param {StaticSymbol} symbol
   * @param {CompileMetadataResolver} metadataResolver
   * @param {DirectiveNormalizer} directiveNormalizer
   * @param {DirectiveResolver} resolver
   * @param {StaticReflector} reflector
   * @param {ResourceResolver} resourceResolver
   * @param {ContextSymbols} projectSymbols
   *
   * @memberOf DirectiveSymbol
   */
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


  /**
   * Returns the non-resolved metadata for given directive.
   * If it is a component, this means that the external templates
   * and styles won't be read from the drive. Also, the paths to
   * external metadata won't be resolved.
   *
   * @returns {CompileDirectiveMetadata}
   *
   * @memberOf DirectiveSymbol
   */
  getNonResolvedMetadata(): CompileDirectiveMetadata {
    return this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol).metadata;
  }


  // TODO: use the normalizer's cache in order to prevent repetative I/O operations

  /**
   * Returns the normalized and resolved metadata for given directive or component.
   * For components, all the external templates and styles will be read and
   * set as values of the returned `CompileTemplateMetadata` properties.
   *
   * @returns {CompileTemplateMetadata}
   *
   * @memberOf DirectiveSymbol
   */
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
      ngModuleType: this.getModule().type.reference,
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


  /**
   * Returns the module where the given directive has been declared.
   *
   * @returns {(CompileNgModuleMetadata | undefined)}
   *
   * @memberOf DirectiveSymbol
   */
  getModule(): CompileNgModuleMetadata | undefined {
    return this.projectSymbols
      .getAnalyzedModules().ngModuleByPipeOrDirective.get(this.symbol);
  }


  /**
   * Returns the ASTs of all styles of the target directive.
   *
   * @returns {CssAst[]}
   *
   * @memberOf DirectiveSymbol
   */
  getStyleAsts(): CssAst[] {
    return this.getResolvedMetadata()
      .styles.map(s => parseCss(s));
  }

  /**
   * Returns the context into which the template of given
   * component is going to be compiled.
   *
   * @returns {DirectiveContext}
   *
   * @memberOf DirectiveSymbol
   */
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


  /**
   * Returns the compiled template of the target component.
   *
   * @returns {TemplateAstResult}
   *
   * @memberOf DirectiveSymbol
   */
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
        let parser: TemplateParser;
        parser = new TemplateParser(new CompilerConfig,
          expressionParser, new DomElementSchemaRegistry(), htmlParser, undefined, []);
        const htmlResult = htmlParser.parse(source, '');
        const { directives, pipes, schemas } = this.getDirectiveContext();
        const parseResult = parser.tryParseHtml(
            htmlResult, metadata, source, directives, pipes, schemas, '');
        result = {
          templateAst: parseResult.templateAst,
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

  getDependencies() {
    const summary = this.metadataResolver.getInjectableSummary(this.symbol);
    if (!summary) {
      return [];
    } else {
      return (summary.type.diDeps || []).map(d => {
        const meta = new ProviderMeta(d.token.identifier.reference, d);
        return new ProviderSymbol(
          this._program,
          this.metadataResolver.getProviderMetadata(meta),
          this.metadataResolver
        );
      });
    }
  }

  // getProviders() {
  //   return (this.getNonResolvedMetadata().providers || []).map(d => {
  //     const meta = new ProviderMeta(d.token.identifier.reference, d);
  //     return new ProviderSymbol(
  //       this._program,
  //       this.metadataResolver.getProviderMetadata(meta),
  //       this.metadataResolver
  //     );
  //   });
  // }

  // getViewProviders() {
  //   return (this.getNonResolvedMetadata().viewProviders || []).map(d => {
  //     const meta = new ProviderMeta(d.token.identifier.reference, d);
  //     return new ProviderSymbol(
  //       this._program,
  //       this.metadataResolver.getProviderMetadata(meta),
  //       this.metadataResolver
  //     );
  //   });
  // }

  /**
   * Returns if the target directive is a component.
   *
   * @returns {boolean}
   *
   * @memberOf DirectiveSymbol
   */
  isComponent(): boolean {
    return !!this.getResolvedMetadata().template;
  }
}
