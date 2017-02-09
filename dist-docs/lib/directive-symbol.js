import { resolveForwardRef } from '@angular/core';
import { componentModuleUrl, UrlResolver, HtmlParser, I18NHtmlParser, Lexer, Parser, TemplateParser, DomElementSchemaRegistry } from '@angular/compiler';
import { Symbol } from './symbol';
import { parseCss } from './css-parser/parse-css';
/**
 * This class represents the individual directives and wrapps
 * their `StaticSymbol`s produced by the `@angular/compiler`.
 *
 * @export
 * @class DirectiveSymbol
 * @extends {Symbol}
 */
export class DirectiveSymbol extends Symbol {
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
    constructor(program, symbol, metadataResolver, directiveNormalizer, resolver, reflector, resourceResolver, projectSymbols) {
        super(program, symbol);
        this.metadataResolver = metadataResolver;
        this.directiveNormalizer = directiveNormalizer;
        this.resolver = resolver;
        this.reflector = reflector;
        this.resourceResolver = resourceResolver;
        this.projectSymbols = projectSymbols;
        this.urlResolver = new UrlResolver();
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
    getNonResolvedMetadata() {
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
    getResolvedMetadata() {
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
        currentMetadata.styles = currentMetadata.styles.concat(currentMetadata.styleUrls.map(path => this.resourceResolver.getSync(path)));
        return currentMetadata;
    }
    /**
     * Returns the module where the given directive has been declared.
     *
     * @returns {(CompileNgModuleMetadata | undefined)}
     *
     * @memberOf DirectiveSymbol
     */
    getModule() {
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
    getStyleAsts() {
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
    getDirectiveContext() {
        const analyzedModules = this.projectSymbols.getAnalyzedModules();
        let ngModule = analyzedModules.ngModuleByPipeOrDirective.get(this.symbol);
        if (!ngModule) {
            throw new Error('Cannot find module associated with the directive ' + this.symbol.name);
        }
        const resolvedDirectives = ngModule.transitiveModule.directives.map(d => this.metadataResolver.getNonNormalizedDirectiveMetadata(d.reference));
        const directives = resolvedDirectives.filter(d => d !== null).map(d => d.metadata.toSummary());
        const pipes = ngModule.transitiveModule.pipes.map(p => this.metadataResolver.getOrLoadPipeMetadata(p.reference).toSummary());
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
    getTemplateAst() {
        let result;
        try {
            const resolvedMetadata = this.metadataResolver.getNonNormalizedDirectiveMetadata(this.symbol);
            const dirMetadata = this.getResolvedMetadata();
            const source = dirMetadata.template;
            const metadata = resolvedMetadata && resolvedMetadata.metadata;
            if (metadata) {
                const rawHtmlParser = new HtmlParser();
                const htmlParser = new I18NHtmlParser(rawHtmlParser);
                const expressionParser = new Parser(new Lexer());
                const parser = new TemplateParser(expressionParser, new DomElementSchemaRegistry(), htmlParser, undefined, []);
                const htmlResult = htmlParser.parse(source, '');
                const { directives, pipes, schemas } = this.getDirectiveContext();
                const parseResult = parser.tryParseHtml(htmlResult, metadata, source, directives, pipes, schemas, '');
                result = {
                    templateAst: parseResult.templateAst,
                    parseErrors: parseResult.errors,
                    errors: []
                };
            }
            else {
                result = { errors: [{ message: 'Cannot find metadata for the directive' }] };
            }
        }
        catch (e) {
            result = { errors: [{ message: e.message }] };
        }
        return result;
    }
    /**
     * Returns if the target directive is a component.
     *
     * @returns {boolean}
     *
     * @memberOf DirectiveSymbol
     */
    isComponent() {
        return !!this.getResolvedMetadata().template;
    }
}
//# sourceMappingURL=directive-symbol.js.map