import { ViewEncapsulation } from '@angular/core';
import { CompileMetadataResolver, NgModuleResolver, DirectiveResolver, DirectiveNormalizer, HtmlParser, CompilerConfig, PipeResolver, AotSummaryResolver, DomElementSchemaRegistry, extractProgramSymbols, StaticSymbolResolver, StaticSymbolCache, StaticReflector, createOfflineCompileUrlResolver, analyzeNgModules } from '@angular/compiler';
import { CompilerHost, NodeCompilerHostContext } from '@angular/compiler-cli';
import { PipeSymbol } from './pipe-symbol';
import { DirectiveSymbol } from './directive-symbol';
/**
 * Creates a proxy which provides us access to the symbols
 * defined in given context (could be lazy loaded module or the root module).
 *
 * @export
 * @class ContextSymbols
 */
export class ContextSymbols {
    /**
     * Creates an instance of ContextSymbols.
     *
     * @param {ts.Program} program
     * @param {ResourceResolver} resourceResolver
     *
     * @memberOf ContextSymbols
     */
    constructor(program, resourceResolver) {
        this.program = program;
        this.resourceResolver = resourceResolver;
        this.options = this.program.getCompilerOptions();
        this.init();
    }
    /**
     * Returns the metadata associated to this module.
     *
     * @returns {CompileNgModuleMetadata[]}
     *
     * @memberOf ContextSymbols
     */
    getModules() {
        this.validate();
        const result = [];
        this.getAnalyzedModules()
            .ngModuleByPipeOrDirective
            .forEach((m, s) => {
            result.push(m);
        });
        return result;
    }
    /**
     * Returns all the directives available in the context.
     *
     * @returns {DirectiveSymbol[]}
     *
     * @memberOf ContextSymbols
     */
    getDirectives() {
        return this.extractProgramSymbols()
            .filter(symbol => this.metadataResolver.isDirective(symbol))
            .map(symbol => new DirectiveSymbol(this.program, symbol, this.metadataResolver, this.directiveNormalizer, this.directiveResolver, this.reflector, this.resourceResolver, this));
    }
    /**
     * Returns all the pipes available in this module.
     *
     * @returns {PipeSymbol[]}
     *
     * @memberOf ContextSymbols
     */
    getPipes() {
        return this.extractProgramSymbols()
            .filter(v => this.metadataResolver.isPipe(v))
            .map(p => new PipeSymbol(this.program, p, this.pipeResolver, this));
    }
    /**
     * Returns the summary of this context.
     *
     * @returns {(CompileNgModuleSummary | undefined)}
     *
     * @memberOf ContextSymbols
     */
    getContextSummary() {
        const module = this.getModules().pop();
        if (module) {
            return this.metadataResolver.getNgModuleSummary(module.type.reference);
        }
        return undefined;
    }
    /**
     * Updates the program which has impact over the loaded symbols.
     * In case the `udpate` method is called with program different from
     * the current one, all the internal caches will be cleared.
     *
     * @param {ts.Program} program
     *
     * @memberOf ContextSymbols
     */
    updateProgram(program) {
        if (program !== this.program) {
            this.program = program;
            this.validate();
        }
    }
    /** @internal */
    getAnalyzedModules() {
        let analyzedModules = this.analyzedModules;
        if (!analyzedModules) {
            const analyzeHost = { isSourceFile(filePath) { return true; } };
            const programSymbols = extractProgramSymbols(this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), analyzeHost);
            analyzedModules = this.analyzedModules =
                analyzeNgModules(programSymbols, analyzeHost, this.metadataResolver);
        }
        return analyzedModules;
    }
    extractProgramSymbols() {
        return extractProgramSymbols(this.staticSymbolResolver, this.program.getSourceFiles().map(sf => sf.fileName), {
            isSourceFile() { return true; }
        });
    }
    validate() {
        const program = this.program;
        if (this.lastProgram !== program) {
            this.clearCaches();
            this.lastProgram = program;
            this.init();
        }
    }
    clearCaches() {
        this.metadataResolver.clearCache();
        this.directiveNormalizer.clearCache();
    }
    init() {
        const staticSymbolCache = new StaticSymbolCache();
        const summaryResolver = new AotSummaryResolver({
            loadSummary(filePath) { return ''; },
            isSourceFile(sourceFilePath) { return true; },
        }, staticSymbolCache);
        const parser = new HtmlParser();
        const config = new CompilerConfig({
            genDebugInfo: false,
            defaultEncapsulation: ViewEncapsulation.Emulated,
            logBindingUpdate: false,
            useJit: false
        });
        this.staticResolverHost = new CompilerHost(this.program, this.options, new NodeCompilerHostContext());
        this.staticSymbolResolver = new StaticSymbolResolver(
        // The strict null check gets confused here
        this.staticResolverHost, staticSymbolCache, summaryResolver, (e, filePath) => {
            console.log(e, filePath);
        });
        this.reflector = new StaticReflector(this.staticSymbolResolver, [], [], (e, filePath) => {
            console.log(e, filePath);
        });
        const ngModuleResolver = new NgModuleResolver(this.reflector);
        this.directiveResolver = new DirectiveResolver(this.reflector);
        this.pipeResolver = new PipeResolver(this.reflector);
        this.urlResolver = createOfflineCompileUrlResolver();
        this.directiveNormalizer = new DirectiveNormalizer(this.resourceResolver, this.urlResolver, parser, config);
        this.metadataResolver = new CompileMetadataResolver(ngModuleResolver, this.directiveResolver, this.pipeResolver, summaryResolver, new DomElementSchemaRegistry(), this.directiveNormalizer, this.reflector);
    }
}
//# sourceMappingURL=context-symbols.js.map