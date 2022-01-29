import { ClassDeclaration } from '@angular/compiler-cli/src/ngtsc/reflection';
import { TraitCompiler, TraitState, ResolveResult, ClassRecord } from '@angular/compiler-cli/src/ngtsc/transform';
import { FatalDiagnosticError } from '@angular/compiler-cli/src/ngtsc/diagnostics';
import { AnnotationNames, hasLocalAnnotation, hasDtsAnnotation } from './utils';
import { isFromDtsFile } from '@angular/compiler-cli/src/ngtsc/util/src/typescript';

/** TraitCompiler with friendly interface */
export class NgastTraitCompiler extends TraitCompiler {

  /** Perform analysis for one node */
  analyzeNode(node: ClassDeclaration<ClassDeclaration>) {
    this.analyzeClass(node, null);
  }

  resolveNode(node: ClassDeclaration<ClassDeclaration>) {
    const record = this.recordFor(node);
    for (let trait of record?.traits || []) {
      const handler = trait.handler;
      switch (trait.state) {
        case TraitState.Skipped:
        case TraitState.Pending:
          throw new Error(`Resolving a trait that hasn't been analyzed: ${node.name.text} / ${
              Object.getPrototypeOf(trait.handler).constructor.name}`);
        case TraitState.Resolved:
          throw new Error(`Resolving an already resolved trait`);
      }

      if (handler.resolve === undefined) {
        // No resolution of this trait needed - it's considered successful by default.
        trait = trait.toResolved(null, null);
        continue;
      }

      let result: ResolveResult<unknown>;
      try {
        result = handler.resolve(node, trait.analysis as Readonly<unknown>, trait.symbol);
      } catch (err) {
        if (err instanceof FatalDiagnosticError) {
          trait = trait.toResolved(null, [err.toDiagnostic()]);
          continue;
        } else {
          throw err;
        }
      }

      if (result.diagnostics !== undefined && result.diagnostics.length > 0) {
        trait = trait.toResolved(null, result.diagnostics);
      } else {
        if (result.data !== undefined) {
          trait = trait.toResolved(result.data, null);
        } else {
          trait = trait.toResolved(null, null);
        }
      }

      // @question reexportMap is a private property of TraitCompiler, I'm not sure how I can access it in another way
      if (result.reexports !== undefined) {
        const fileName = node.getSourceFile().fileName;
        if (!this['reexportMap'].has(fileName)) {
          this['reexportMap'].set(fileName, new Map<string, [string, string]>());
        }
        const fileReexports = this['reexportMap'].get(fileName)!;
        for (const reexport of result.reexports) {
          fileReexports.set(reexport.asAlias, [reexport.fromModule, reexport.symbolName]);
        }
      }
    }
  }

  allRecords(annotation?: AnnotationNames) {
    const records: ClassRecord[] = [];
    this.fileToClasses.forEach(nodes => {
      nodes.forEach(node => {
        const record = this.recordFor(node);
        if (record) {
          if (!annotation) {
            records.push(record);
          } else if (isFromDtsFile(node)) {
            const members = this['reflector'].getMembersOfClass(node);
            if (hasDtsAnnotation(members, annotation)) {
              records.push(record);
            }
          } else if (hasLocalAnnotation(record.node, annotation)) {
            records.push(record);
          }
        }
      });
    });
    return records;
  }

}
