import {
  TmplAstNode,
  TmplAstText,
  TmplAstElement,
  TmplAstIcu,
  TmplAstBoundText,
  TmplAstBoundEvent,
  TmplAstTemplate,
  TmplAstBoundAttribute,
  TmplAstTextAttribute,
  TmplAstContent,
  TmplAstVariable,
  TmplAstReference,
  TmplAstRecursiveVisitor,
  SelectorMatcher,
  CssSelector,
} from '@angular/compiler';
import { LocalModuleScope } from '@angular/compiler-cli/src/ngtsc/scope';

import { ComponentSymbol } from './component.symbol';
import { DirectiveSymbol } from './directive.symbol';
import { WorkspaceSymbols } from './workspace.symbols';

export interface TemplateNode {
  component: ComponentSymbol | null;
  directives: DirectiveSymbol[];
  name: string;
  children: TemplateNode[];
  attributes: string[];
  variables: string[];
  references: string[];
}

export class TransformTemplateVisitor implements TmplAstRecursiveVisitor {
  private _matcher = new SelectorMatcher();
  constructor(
    private _componentScope: LocalModuleScope,
    private _workspace: WorkspaceSymbols
  ) {
    this._matcher = new SelectorMatcher();
    this._componentScope.compilation.directives.forEach((directive) => {
      const selector = directive.selector;
      if (!selector) {
        return;
      }
      this._matcher.addSelectables(CssSelector.parse(selector), () => {
        return this._workspace.getSymbol(directive.ref.node);
      });
    });
  }

  visit(node: TmplAstNode) {
    return node.visit(this);
  }

  visitElement(element: TmplAstElement): TemplateNode {
    return this._visitElementOrTemplate(element);
  }

  visitTemplate(template: TmplAstTemplate): TemplateNode {
    return this._visitElementOrTemplate(template);
  }

  visitContent(content: TmplAstContent): TemplateNode {
    return {
      component: null,
      directives: [],
      name: 'ng-content',
      attributes: content.attributes.map((attribute) => attribute.visit(this)),
      children: [],
      references: [],
      variables: [],
    };
  }

  visitVariable(variable: TmplAstVariable): string {
    return variable.name;
  }

  visitReference(reference: TmplAstReference): string {
    return reference.name;
  }

  visitTextAttribute(attribute: TmplAstTextAttribute): string {
    return attribute.name;
  }

  visitBoundAttribute(attribute: TmplAstBoundAttribute): string {
    return attribute.name;
  }

  visitBoundEvent(attribute: TmplAstBoundEvent): string {
    return attribute.name;
  }

  visitText(_: TmplAstText): void {
    return;
  }

  visitBoundText(_: TmplAstBoundText): void {
    return;
  }

  visitIcu(_: TmplAstIcu): void {
    return;
  }

  private _visitElementOrTemplate(element: TmplAstTemplate | TmplAstElement) {
    const name =
      element instanceof TmplAstElement ? element.name : 'ng-template';
    const directives = this._getDirectives(name, element);
    const component = (directives.find(
      (dir) => dir.annotation === 'Component'
    ) ?? null) as ComponentSymbol | null;
    return {
      name,
      component,
      directives: directives.filter(
        (dir) => dir.annotation === 'Directive'
      ) as DirectiveSymbol[],
      attributes: element.attributes.map((attribute) => attribute.visit(this)),
      children: element.children.map((child) => child.visit(this)),
      references: element.references.map((ref) => ref.visit(this)),
      variables: [],
    };
  }

  private _getDirectives(
    name: string,
    element: TmplAstElement | TmplAstTemplate
  ): (DirectiveSymbol | ComponentSymbol)[] {
    const selector = createCssSelector(
      name,
      getAttrsForDirectiveMatching(element)
    );
    const result: (DirectiveSymbol | ComponentSymbol)[] = [];
    this._matcher.match(
      selector,
      (_, callback: () => DirectiveSymbol | ComponentSymbol) => {
        result.push(callback());
      }
    );
    return result;
  }
}

const splitNsName = (elementName: string): [string | null, string] => {
  if (elementName[0] != ':') {
    return [null, elementName];
  }

  const colonIndex = elementName.indexOf(':', 1);

  if (colonIndex == -1) {
    throw new Error(
      `Unsupported format "${elementName}" expecting ":namespace:name"`
    );
  }

  return [elementName.slice(1, colonIndex), elementName.slice(colonIndex + 1)];
};

const createCssSelector = (
  elementName: string,
  attributes: { [name: string]: string }
): CssSelector => {
  const cssSelector = new CssSelector();
  const elementNameNoNs = splitNsName(elementName)[1];

  cssSelector.setElement(elementNameNoNs);

  Object.getOwnPropertyNames(attributes).forEach((name) => {
    const nameNoNs = splitNsName(name)[1];
    const value = attributes[name];

    cssSelector.addAttribute(nameNoNs, value);
    if (name.toLowerCase() === 'class') {
      const classes = value.trim().split(/\s+/);
      classes.forEach((className) => cssSelector.addClassName(className));
    }
  });

  return cssSelector;
};

const getAttrsForDirectiveMatching = (
  elOrTpl: TmplAstElement | TmplAstTemplate
): { [name: string]: string } => {
  const attributesMap: { [name: string]: string } = {};

  if (elOrTpl instanceof TmplAstTemplate && elOrTpl.tagName !== 'ng-template') {
    elOrTpl.templateAttrs.forEach((a) => (attributesMap[a.name] = ''));
  } else {
    elOrTpl.attributes.forEach((a) => {
      if (!isI18nAttribute(a.name)) {
        attributesMap[a.name] = a.value;
      }
    });

    elOrTpl.inputs.forEach((i) => {
      attributesMap[i.name] = '';
    });
    elOrTpl.outputs.forEach((o) => {
      attributesMap[o.name] = '';
    });
  }

  return attributesMap;
};

/** Name of the i18n attributes **/
const I18N_ATTR = 'i18n';
const I18N_ATTR_PREFIX = 'i18n-';

const isI18nAttribute = (name: string) => {
  return name === I18N_ATTR || name.startsWith(I18N_ATTR_PREFIX);
};
