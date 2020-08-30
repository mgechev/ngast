import { Program } from 'typescript';
import { SchemaMetadata, resolveForwardRef } from '@angular/core';
import {
  StaticSymbol,
  CompileMetadataResolver,
  StaticReflector,
  UrlResolver,
  HtmlParser,
  I18NHtmlParser,
  Lexer,
  Parser,
  TemplateParser,
  DomElementSchemaRegistry,
  DirectiveNormalizer,
  CompilePipeSummary,
  CompileNgModuleMetadata,
  CompileTemplateMetadata,
  CompileDirectiveMetadata,
  TemplateAst,
  CompilerConfig,
  ParseError,
  ProviderMeta,
  CompileDirectiveSummary
} from '@angular/compiler';

import { ProjectSymbols } from './project-symbols';
import { Symbol } from './symbol';
import { ResourceResolver } from './resource-resolver';

import { CssAst } from '../css-parser/css-ast';
import { parseCss } from '../css-parser/parse-css';
import { ProviderSymbol } from './provider-symbol';
import { sep } from 'path';

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
  errors?: { message: string }[];
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
    private reflector: StaticReflector,
    private resourceResolver: ResourceResolver,
    private projectSymbols: ProjectSymbols
  ) {
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
  getNonResolvedMetadata(): CompileDirectiveMetadata | null {
    // console.log(this.symbol.name, this.symbol.filePath);
    const data = this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
    if (data) {
      return data.metadata;
    }
    return null;
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
  getResolvedMetadata(): CompileTemplateMetadata | null {
    const directiveInfo = this.getDirectiveMetadata();
    if(!directiveInfo) {
      return null;
    }
    this.templateDataVoid(directiveInfo);
    this.stylesDataVoid(directiveInfo);
    const module = this.getModule();
    if (!module) {
      return null;
    }
    const config = Object.assign({}, directiveInfo.templateMetadata, {
      ngModuleType: module.type.reference,
      moduleUrl: directiveInfo.componentUrl,
      templateUrl: null,
      styleUrls: null,
      componentType: directiveInfo.componentType
    });
    const currentMetadata = this.directiveNormalizer.normalizeTemplate(config) as CompileTemplateMetadata;
    currentMetadata.template = directiveInfo.templateMetadata.template;
    currentMetadata.templateUrl = directiveInfo.templateMetadata.templateUrl;
    currentMetadata.styles = directiveInfo.templateMetadata.styles;
    currentMetadata.styleUrls = directiveInfo.templateMetadata.styleUrls;
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
    return this.projectSymbols.getAnalyzedModules().ngModuleByPipeOrDirective.get(this.symbol);
  }

  /**
   * Returns the ASTs of all styles of the target directive.
   *
   * @returns {CssAst[]}
   *
   * @memberOf DirectiveSymbol
   */
  getStyleAsts(): CssAst[] | null {
    const metadata = this.getResolvedMetadata();
    if (metadata) {
      return metadata.styles.map(s => parseCss(s));
    }
    return null;
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
    const resolvedDirectives = ngModule.transitiveModule.directives.map(d =>
      this.metadataResolver.getNonNormalizedDirectiveMetadata(d.reference)
    );

    // TypeScript doesn't handle well filtering & strictNull
    const tempDirectives: (CompileDirectiveSummary | null)[] = resolvedDirectives.map(d => {
      if (d) {
        return d.metadata.toSummary();
      } else {
        return null;
      }
    });
    const directives: CompileDirectiveSummary[] = [];
    for (let i = 0; i < tempDirectives.length; i += 1) {
      const dir = tempDirectives[i];
      if (dir) {
        directives.push(dir);
      }
    }
    const pipes = ngModule.transitiveModule.pipes.map(p =>
      this.metadataResolver.getOrLoadPipeMetadata(p.reference).toSummary()
    );
    const schemas = ngModule.schemas;
    return {
      pipes,
      directives,
      schemas
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
      const resolvedMetadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
      const directiveInfo = this.getDirectiveMetadata();
      if (directiveInfo && directiveInfo.templateMetadata) {
        this.templateDataVoid(directiveInfo);
        const source = directiveInfo.templateMetadata.template;
        if (!source) {
          result = { errors: [{ message: 'Cannot find template for the directive' }] };
        } else {
          const metadata = resolvedMetadata && resolvedMetadata.metadata;
          if (metadata) {
            const rawHtmlParser = new HtmlParser();
            const htmlParser = new I18NHtmlParser(rawHtmlParser);
            const expressionParser = new Parser(new Lexer());
            let parser: TemplateParser;
            parser = new TemplateParser(
              new CompilerConfig(),
              this.reflector,
              expressionParser,
              new DomElementSchemaRegistry(),
              htmlParser,
              {
                log() {
                  return null;
                },
                warn() {
                  return null;
                }
              },
              []
            );
            const htmlResult = htmlParser.parse(source, '');
            const { directives, pipes, schemas } = this.getDirectiveContext();
            const parseResult = parser.tryParseHtml(htmlResult, metadata, directives, pipes, schemas);
            result = {
              templateAst: parseResult.templateAst,
              parseErrors: parseResult.errors,
              errors: []
            };
          } else {
            result = { errors: [{ message: 'Cannot find metadata for the directive' }] };
          }
        }
      } else {
        result = { errors: [{ message: 'Cannot find metadata for the directive' }] };
      }
    } catch (e) {
      result = { errors: [{ message: e.message }] };
    }
    return result;
  }

  getDependencies() {
    const summary = this.metadataResolver.getInjectableSummary(this.symbol);
    if (!summary) {
      return [];
    } else {
      return (summary.type.diDeps || []).map(d => {
        let token = d.token;
        if (d.token) {
          if (d.token.identifier) {
            token = d.token.identifier.reference;
          }
        }
        const meta = new ProviderMeta(token, { useClass: d.value });
        return new ProviderSymbol(
          this._program,
          this.metadataResolver.getProviderMetadata(meta),
          this.metadataResolver
        );
      });
    }
  }

  getProviders() {
    const meta = this.getNonResolvedMetadata();
    if (meta) {
      return (meta.providers || []).map(d => {
        return new ProviderSymbol(this._program, d, this.metadataResolver);
      });
    }
    return [];
  }

  getViewProviders() {
    const meta = this.getNonResolvedMetadata();
    if (meta) {
      return (meta.viewProviders || []).map(d => {
        return new ProviderSymbol(this._program, d, this.metadataResolver);
      });
    } else {
      return [];
    }
  }

  /**
   * Returns if the target directive is a component.
   *
   * @returns {boolean}
   *
   * @memberOf DirectiveSymbol
   */
  isComponent(): boolean {
    const meta = this.getResolvedMetadata();
    if (meta) {
      return !!meta.template || !!meta.templateUrl;
    } else {
      return false;
    }
  }
  private templateDataVoid(directiveInfo) {
    if (!directiveInfo.templateMetadata.template && directiveInfo.templateMetadata.templateUrl) {
      directiveInfo.templateMetadata.templateUrl = this.urlResolver.resolve(directiveInfo.componentUrl,
        directiveInfo.templateMetadata.templateUrl);
      directiveInfo.templateMetadata.template = this.resourceResolver.getSync(directiveInfo.templateMetadata.templateUrl);
    }
  }
  private stylesDataVoid(directiveInfo) {
    if (directiveInfo.templateMetadata.styleUrls.length) {
      directiveInfo.templateMetadata.styleUrls = directiveInfo.templateMetadata.styleUrls.map(s =>
        this.urlResolver.resolve(directiveInfo.componentUrl, s)
      );
      directiveInfo.templateMetadata.styles = directiveInfo.templateMetadata.styles.concat(
        directiveInfo.templateMetadata.styleUrls.map(s => this.resourceResolver.getSync(s))
      );
    }
  }
  private getDirectiveMetadata() {
    const metadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
    const componentType = resolveForwardRef(this.symbol);
    if (!metadata) {
      return null;
    }
    const componentUrl = this.reflector.componentModuleUrl(componentType);
    const templateMetadata = metadata.metadata.template;
    // Required because otherwise the normalizer gets confused.
    if (!templateMetadata) {
      return null;
    }
    return {
      metadata,
      componentType,
      componentUrl,
      templateMetadata
    };
  }
}
