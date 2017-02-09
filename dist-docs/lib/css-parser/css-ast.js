/* tslint:disable */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { CssToken, CssTokenType } from './css-lexer';
export var BlockType;
(function (BlockType) {
    BlockType[BlockType["Import"] = 0] = "Import";
    BlockType[BlockType["Charset"] = 1] = "Charset";
    BlockType[BlockType["Namespace"] = 2] = "Namespace";
    BlockType[BlockType["Supports"] = 3] = "Supports";
    BlockType[BlockType["Keyframes"] = 4] = "Keyframes";
    BlockType[BlockType["MediaQuery"] = 5] = "MediaQuery";
    BlockType[BlockType["Selector"] = 6] = "Selector";
    BlockType[BlockType["FontFace"] = 7] = "FontFace";
    BlockType[BlockType["Page"] = 8] = "Page";
    BlockType[BlockType["Document"] = 9] = "Document";
    BlockType[BlockType["Viewport"] = 10] = "Viewport";
    BlockType[BlockType["Unsupported"] = 11] = "Unsupported";
})(BlockType || (BlockType = {}));
export class CssAst {
    constructor(location) {
        this.location = location;
    }
    get start() { return this.location.start; }
    get end() { return this.location.end; }
}
export class CssStyleValueAst extends CssAst {
    constructor(location, tokens, strValue) {
        super(location);
        this.tokens = tokens;
        this.strValue = strValue;
    }
    visit(visitor, context) { return visitor.visitCssValue(this); }
}
export class CssRuleAst extends CssAst {
    constructor(location) { super(location); }
}
export class CssBlockRuleAst extends CssRuleAst {
    constructor(location, type, block, name = null) {
        super(location);
        this.location = location;
        this.type = type;
        this.block = block;
        this.name = name;
    }
    visit(visitor, context) {
        return visitor.visitCssBlock(this.block, context);
    }
}
export class CssKeyframeRuleAst extends CssBlockRuleAst {
    constructor(location, name, block) {
        super(location, BlockType.Keyframes, block, name);
    }
    visit(visitor, context) {
        return visitor.visitCssKeyframeRule(this, context);
    }
}
export class CssKeyframeDefinitionAst extends CssBlockRuleAst {
    constructor(location, steps, block) {
        super(location, BlockType.Keyframes, block, mergeTokens(steps, ','));
        this.steps = steps;
    }
    visit(visitor, context) {
        return visitor.visitCssKeyframeDefinition(this, context);
    }
}
export class CssBlockDefinitionRuleAst extends CssBlockRuleAst {
    constructor(location, strValue, type, query, block) {
        super(location, type, block);
        this.strValue = strValue;
        this.query = query;
        var firstCssToken = query.tokens[0];
        this.name = new CssToken(firstCssToken.index, firstCssToken.column, firstCssToken.line, CssTokenType.Identifier, this.strValue);
    }
    visit(visitor, context) {
        return visitor.visitCssBlock(this.block, context);
    }
}
export class CssMediaQueryRuleAst extends CssBlockDefinitionRuleAst {
    constructor(location, strValue, query, block) {
        super(location, strValue, BlockType.MediaQuery, query, block);
    }
    visit(visitor, context) {
        return visitor.visitCssMediaQueryRule(this, context);
    }
}
export class CssAtRulePredicateAst extends CssAst {
    constructor(location, strValue, tokens) {
        super(location);
        this.strValue = strValue;
        this.tokens = tokens;
    }
    visit(visitor, context) {
        return visitor.visitCssAtRulePredicate(this, context);
    }
}
export class CssInlineRuleAst extends CssRuleAst {
    constructor(location, type, value) {
        super(location);
        this.type = type;
        this.value = value;
    }
    visit(visitor, context) {
        return visitor.visitCssInlineRule(this, context);
    }
}
export class CssSelectorRuleAst extends CssBlockRuleAst {
    constructor(location, selectors, block) {
        super(location, BlockType.Selector, block);
        this.selectors = selectors;
        this.strValue = selectors.map(selector => selector.strValue).join(',');
    }
    visit(visitor, context) {
        return visitor.visitCssSelectorRule(this, context);
    }
}
export class CssDefinitionAst extends CssAst {
    constructor(location, property, value) {
        super(location);
        this.property = property;
        this.value = value;
    }
    visit(visitor, context) {
        return visitor.visitCssDefinition(this, context);
    }
}
export class CssSelectorPartAst extends CssAst {
    constructor(location) { super(location); }
}
export class CssSelectorAst extends CssSelectorPartAst {
    constructor(location, selectorParts) {
        super(location);
        this.selectorParts = selectorParts;
        this.strValue = selectorParts.map(part => part.strValue).join('');
    }
    visit(visitor, context) {
        return visitor.visitCssSelector(this, context);
    }
}
export class CssSimpleSelectorAst extends CssSelectorPartAst {
    constructor(location, tokens, strValue, pseudoSelectors, operator) {
        super(location);
        this.tokens = tokens;
        this.strValue = strValue;
        this.pseudoSelectors = pseudoSelectors;
        this.operator = operator;
    }
    visit(visitor, context) {
        return visitor.visitCssSimpleSelector(this, context);
    }
}
export class CssPseudoSelectorAst extends CssSelectorPartAst {
    constructor(location, strValue, name, tokens, innerSelectors) {
        super(location);
        this.strValue = strValue;
        this.name = name;
        this.tokens = tokens;
        this.innerSelectors = innerSelectors;
    }
    visit(visitor, context) {
        return visitor.visitCssPseudoSelector(this, context);
    }
}
export class CssBlockAst extends CssAst {
    constructor(location, entries) {
        super(location);
        this.entries = entries;
    }
    visit(visitor, context) { return visitor.visitCssBlock(this, context); }
}
/*
 a style block is different from a standard block because it contains
 css prop:value definitions. A regular block can contain a list of Ast entries.
 */
export class CssStylesBlockAst extends CssBlockAst {
    constructor(location, definitions) {
        super(location, definitions);
        this.definitions = definitions;
    }
    visit(visitor, context) {
        return visitor.visitCssStylesBlock(this, context);
    }
}
export class CssStyleSheetAst extends CssAst {
    constructor(location, rules) {
        super(location);
        this.rules = rules;
    }
    visit(visitor, context) {
        return visitor.visitCssStyleSheet(this, context);
    }
}
export class CssUnknownRuleAst extends CssRuleAst {
    constructor(location, ruleName, tokens) {
        super(location);
        this.ruleName = ruleName;
        this.tokens = tokens;
    }
    visit(visitor, context) {
        return visitor.visitCssUnknownRule(this, context);
    }
}
export class CssUnknownTokenListAst extends CssRuleAst {
    constructor(location, name, tokens) {
        super(location);
        this.name = name;
        this.tokens = tokens;
    }
    visit(visitor, context) {
        return visitor.visitCssUnknownTokenList(this, context);
    }
}
export function mergeTokens(tokens, separator = '') {
    var mainToken = tokens[0];
    var str = mainToken.strValue;
    for (var i = 1; i < tokens.length; i++) {
        str += separator + tokens[i].strValue;
    }
    return new CssToken(mainToken.index, mainToken.column, mainToken.line, mainToken.type, str);
}
//# sourceMappingURL=css-ast.js.map