import { resolveForwardRef } from '@angular/core';
import { Symbol } from './symbol';
/**
 * A wrapper around the pipe symbol.
 *
 * @export
 * @class PipeSymbol
 * @extends {Symbol}
 */
export class PipeSymbol extends Symbol {
    /**
     * Creates an instance of PipeSymbol.
     *
     * @param {Program} program
     * @param {StaticSymbol} symbol
     * @param {PipeResolver} resolver
     * @param {ContextSymbols} projectSymbols
     *
     * @memberOf PipeSymbol
     */
    constructor(program, symbol, resolver, projectSymbols) {
        super(program, symbol);
        this.resolver = resolver;
        this.projectSymbols = projectSymbols;
    }
    /**
     * Returns the module where the wrapped pipe was defined.
     *
     * @returns {(CompileNgModuleMetadata | undefined)}
     *
     * @memberOf PipeSymbol
     */
    getModule() {
        return this.projectSymbols.getAnalyzedModules()
            .ngModuleByPipeOrDirective.get(this.symbol);
    }
    /**
     * Returns the pipe metadata.
     *
     * @returns {Pipe}
     *
     * @memberOf PipeSymbol
     */
    getMetadata() {
        return this.resolver.resolve(resolveForwardRef(this.symbol));
    }
}
//# sourceMappingURL=pipe-symbol.js.map