/* tslint:disable */
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as chars from './chars';
export var CssTokenType;
(function (CssTokenType) {
    CssTokenType[CssTokenType["EOF"] = 0] = "EOF";
    CssTokenType[CssTokenType["String"] = 1] = "String";
    CssTokenType[CssTokenType["Comment"] = 2] = "Comment";
    CssTokenType[CssTokenType["Identifier"] = 3] = "Identifier";
    CssTokenType[CssTokenType["Number"] = 4] = "Number";
    CssTokenType[CssTokenType["IdentifierOrNumber"] = 5] = "IdentifierOrNumber";
    CssTokenType[CssTokenType["AtKeyword"] = 6] = "AtKeyword";
    CssTokenType[CssTokenType["Character"] = 7] = "Character";
    CssTokenType[CssTokenType["Whitespace"] = 8] = "Whitespace";
    CssTokenType[CssTokenType["Invalid"] = 9] = "Invalid";
})(CssTokenType || (CssTokenType = {}));
export var CssLexerMode;
(function (CssLexerMode) {
    CssLexerMode[CssLexerMode["ALL"] = 0] = "ALL";
    CssLexerMode[CssLexerMode["ALL_TRACK_WS"] = 1] = "ALL_TRACK_WS";
    CssLexerMode[CssLexerMode["SELECTOR"] = 2] = "SELECTOR";
    CssLexerMode[CssLexerMode["PSEUDO_SELECTOR"] = 3] = "PSEUDO_SELECTOR";
    CssLexerMode[CssLexerMode["PSEUDO_SELECTOR_WITH_ARGUMENTS"] = 4] = "PSEUDO_SELECTOR_WITH_ARGUMENTS";
    CssLexerMode[CssLexerMode["ATTRIBUTE_SELECTOR"] = 5] = "ATTRIBUTE_SELECTOR";
    CssLexerMode[CssLexerMode["AT_RULE_QUERY"] = 6] = "AT_RULE_QUERY";
    CssLexerMode[CssLexerMode["MEDIA_QUERY"] = 7] = "MEDIA_QUERY";
    CssLexerMode[CssLexerMode["BLOCK"] = 8] = "BLOCK";
    CssLexerMode[CssLexerMode["KEYFRAME_BLOCK"] = 9] = "KEYFRAME_BLOCK";
    CssLexerMode[CssLexerMode["STYLE_BLOCK"] = 10] = "STYLE_BLOCK";
    CssLexerMode[CssLexerMode["STYLE_VALUE"] = 11] = "STYLE_VALUE";
    CssLexerMode[CssLexerMode["STYLE_VALUE_FUNCTION"] = 12] = "STYLE_VALUE_FUNCTION";
    CssLexerMode[CssLexerMode["STYLE_CALC_FUNCTION"] = 13] = "STYLE_CALC_FUNCTION";
})(CssLexerMode || (CssLexerMode = {}));
export class LexedCssResult {
    constructor(error, token) {
        this.error = error;
        this.token = token;
    }
}
export function generateErrorMessage(input, message, errorValue, index, row, column) {
    return `${message} at column ${row}:${column} in expression [` +
        findProblemCode(input, errorValue, index, column) + ']';
}
export function findProblemCode(input, errorValue, index, column) {
    var endOfProblemLine = index;
    var current = charCode(input, index);
    while (current > 0 && !isNewline(current)) {
        current = charCode(input, ++endOfProblemLine);
    }
    var choppedString = input.substring(0, endOfProblemLine);
    var pointerPadding = '';
    for (var i = 0; i < column; i++) {
        pointerPadding += ' ';
    }
    var pointerString = '';
    for (var i = 0; i < errorValue.length; i++) {
        pointerString += '^';
    }
    return choppedString + '\n' + pointerPadding + pointerString + '\n';
}
export class CssToken {
    constructor(index, column, line, type, strValue) {
        this.index = index;
        this.column = column;
        this.line = line;
        this.type = type;
        this.strValue = strValue;
        this.numValue = charCode(strValue, 0);
    }
}
export class CssLexer {
    scan(text, trackComments = false) {
        return new CssScanner(text, trackComments);
    }
}
export class CssScannerError {
    constructor(token, message) {
        this.token = token;
        this.rawMessage = message;
    }
    toString() { return this.message; }
}
function _trackWhitespace(mode) {
    switch (mode) {
        case CssLexerMode.SELECTOR:
        case CssLexerMode.PSEUDO_SELECTOR:
        case CssLexerMode.ALL_TRACK_WS:
        case CssLexerMode.STYLE_VALUE:
            return true;
        default:
            return false;
    }
}
export class CssScanner {
    constructor(input, _trackComments = false) {
        this.input = input;
        this._trackComments = _trackComments;
        this.length = 0;
        this.index = -1;
        this.column = -1;
        this.line = 0;
        /** @internal */
        this._currentMode = CssLexerMode.BLOCK;
        /** @internal */
        this._currentError = null;
        this.length = this.input.length;
        this.peekPeek = this.peekAt(0);
        this.advance();
    }
    getMode() { return this._currentMode; }
    setMode(mode) {
        if (this._currentMode != mode) {
            if (_trackWhitespace(this._currentMode) && !_trackWhitespace(mode)) {
                this.consumeWhitespace();
            }
            this._currentMode = mode;
        }
    }
    advance() {
        if (isNewline(this.peek)) {
            this.column = 0;
            this.line++;
        }
        else {
            this.column++;
        }
        this.index++;
        this.peek = this.peekPeek;
        this.peekPeek = this.peekAt(this.index + 1);
    }
    peekAt(index) {
        return index >= this.length ? chars.$EOF : this.input.charCodeAt(index);
    }
    consumeEmptyStatements() {
        this.consumeWhitespace();
        while (this.peek == chars.$SEMICOLON) {
            this.advance();
            this.consumeWhitespace();
        }
    }
    consumeWhitespace() {
        while (chars.isWhitespace(this.peek) || isNewline(this.peek)) {
            this.advance();
            if (!this._trackComments && isCommentStart(this.peek, this.peekPeek)) {
                this.advance(); // /
                this.advance(); // *
                while (!isCommentEnd(this.peek, this.peekPeek)) {
                    if (this.peek == chars.$EOF) {
                        this.error('Unterminated comment');
                    }
                    this.advance();
                }
                this.advance(); // *
                this.advance(); // /
            }
        }
    }
    consume(type, value = null) {
        var mode = this._currentMode;
        this.setMode(_trackWhitespace(mode) ? CssLexerMode.ALL_TRACK_WS : CssLexerMode.ALL);
        var previousIndex = this.index;
        var previousLine = this.line;
        var previousColumn = this.column;
        var next;
        var output = this.scan();
        if (output) {
            // just incase the inner scan method returned an error
            if (output.error) {
                this.setMode(mode);
                return output;
            }
            next = output.token;
        }
        if (!next) {
            next = new CssToken(this.index, this.column, this.line, CssTokenType.EOF, 'end of file');
        }
        var isMatchingType = false;
        if (type == CssTokenType.IdentifierOrNumber) {
            // TODO (matsko): implement array traversal for lookup here
            isMatchingType = next.type == CssTokenType.Number || next.type == CssTokenType.Identifier;
        }
        else {
            isMatchingType = next.type == type;
        }
        // before throwing the error we need to bring back the former
        // mode so that the parser can recover...
        this.setMode(mode);
        var error = null;
        if (!isMatchingType || (value && value != next.strValue)) {
            var errorMessage = CssTokenType[next.type] + ' does not match expected ' +
                CssTokenType[type] + ' value';
            if (value) {
                errorMessage += ' ("' + next.strValue + '" should match "' + value + '")';
            }
            error = new CssScannerError(next, generateErrorMessage(this.input, errorMessage, next.strValue, previousIndex, previousLine, previousColumn));
        }
        return new LexedCssResult(error, next);
    }
    scan() {
        var trackWS = _trackWhitespace(this._currentMode);
        if (this.index == 0 && !trackWS) {
            this.consumeWhitespace();
        }
        var token = this._scan();
        if (token == null)
            return null;
        var error = this._currentError;
        this._currentError = null;
        if (!trackWS) {
            this.consumeWhitespace();
        }
        return new LexedCssResult(error, token);
    }
    /** @internal */
    _scan() {
        var peek = this.peek;
        var peekPeek = this.peekPeek;
        if (peek == chars.$EOF)
            return null;
        if (isCommentStart(peek, peekPeek)) {
            // even if comments are not tracked we still lex the
            // comment so we can move the pointer forward
            var commentToken = this.scanComment();
            if (this._trackComments) {
                return commentToken;
            }
        }
        if (_trackWhitespace(this._currentMode) && (chars.isWhitespace(peek) || isNewline(peek))) {
            return this.scanWhitespace();
        }
        peek = this.peek;
        peekPeek = this.peekPeek;
        if (peek == chars.$EOF)
            return null;
        if (isStringStart(peek, peekPeek)) {
            return this.scanString();
        }
        // something like url(cool)
        if (this._currentMode == CssLexerMode.STYLE_VALUE_FUNCTION) {
            return this.scanCssValueFunction();
        }
        var isModifier = peek == chars.$PLUS || peek == chars.$MINUS;
        var digitA = isModifier ? false : chars.isDigit(peek);
        var digitB = chars.isDigit(peekPeek);
        if (digitA || (isModifier && (peekPeek == chars.$PERIOD || digitB)) ||
            (peek == chars.$PERIOD && digitB)) {
            return this.scanNumber();
        }
        if (peek == chars.$AT) {
            return this.scanAtExpression();
        }
        if (isIdentifierStart(peek, peekPeek)) {
            return this.scanIdentifier();
        }
        if (isValidCssCharacter(peek, this._currentMode)) {
            return this.scanCharacter();
        }
        return this.error(`Unexpected character [${String.fromCharCode(peek)}]`);
    }
    scanComment() {
        if (this.assertCondition(isCommentStart(this.peek, this.peekPeek), 'Expected comment start value')) {
            return null;
        }
        var start = this.index;
        var startingColumn = this.column;
        var startingLine = this.line;
        this.advance(); // /
        this.advance(); // *
        while (!isCommentEnd(this.peek, this.peekPeek)) {
            if (this.peek == chars.$EOF) {
                this.error('Unterminated comment');
            }
            this.advance();
        }
        this.advance(); // *
        this.advance(); // /
        var str = this.input.substring(start, this.index);
        return new CssToken(start, startingColumn, startingLine, CssTokenType.Comment, str);
    }
    scanWhitespace() {
        var start = this.index;
        var startingColumn = this.column;
        var startingLine = this.line;
        while (chars.isWhitespace(this.peek) && this.peek != chars.$EOF) {
            this.advance();
        }
        var str = this.input.substring(start, this.index);
        return new CssToken(start, startingColumn, startingLine, CssTokenType.Whitespace, str);
    }
    scanString() {
        if (this.assertCondition(isStringStart(this.peek, this.peekPeek), 'Unexpected non-string starting value')) {
            return null;
        }
        var target = this.peek;
        var start = this.index;
        var startingColumn = this.column;
        var startingLine = this.line;
        var previous = target;
        this.advance();
        while (!isCharMatch(target, previous, this.peek)) {
            if (this.peek == chars.$EOF || isNewline(this.peek)) {
                this.error('Unterminated quote');
            }
            previous = this.peek;
            this.advance();
        }
        if (this.assertCondition(this.peek == target, 'Unterminated quote')) {
            return null;
        }
        this.advance();
        var str = this.input.substring(start, this.index);
        return new CssToken(start, startingColumn, startingLine, CssTokenType.String, str);
    }
    scanNumber() {
        var start = this.index;
        var startingColumn = this.column;
        if (this.peek == chars.$PLUS || this.peek == chars.$MINUS) {
            this.advance();
        }
        var periodUsed = false;
        while (chars.isDigit(this.peek) || this.peek == chars.$PERIOD) {
            if (this.peek == chars.$PERIOD) {
                if (periodUsed) {
                    this.error('Unexpected use of a second period value');
                }
                periodUsed = true;
            }
            this.advance();
        }
        var strValue = this.input.substring(start, this.index);
        return new CssToken(start, startingColumn, this.line, CssTokenType.Number, strValue);
    }
    scanIdentifier() {
        if (this.assertCondition(isIdentifierStart(this.peek, this.peekPeek), 'Expected identifier starting value')) {
            return null;
        }
        var start = this.index;
        var startingColumn = this.column;
        while (isIdentifierPart(this.peek)) {
            this.advance();
        }
        var strValue = this.input.substring(start, this.index);
        return new CssToken(start, startingColumn, this.line, CssTokenType.Identifier, strValue);
    }
    scanCssValueFunction() {
        var start = this.index;
        var startingColumn = this.column;
        var parenBalance = 1;
        while (this.peek != chars.$EOF && parenBalance > 0) {
            this.advance();
            if (this.peek == chars.$LPAREN) {
                parenBalance++;
            }
            else if (this.peek == chars.$RPAREN) {
                parenBalance--;
            }
        }
        var strValue = this.input.substring(start, this.index);
        return new CssToken(start, startingColumn, this.line, CssTokenType.Identifier, strValue);
    }
    scanCharacter() {
        var start = this.index;
        var startingColumn = this.column;
        if (this.assertCondition(isValidCssCharacter(this.peek, this._currentMode), charStr(this.peek) + ' is not a valid CSS character')) {
            return null;
        }
        var c = this.input.substring(start, start + 1);
        this.advance();
        return new CssToken(start, startingColumn, this.line, CssTokenType.Character, c);
    }
    scanAtExpression() {
        if (this.assertCondition(this.peek == chars.$AT, 'Expected @ value')) {
            return null;
        }
        var start = this.index;
        var startingColumn = this.column;
        this.advance();
        if (isIdentifierStart(this.peek, this.peekPeek)) {
            var ident = this.scanIdentifier();
            var strValue = '@' + ident.strValue;
            return new CssToken(start, startingColumn, this.line, CssTokenType.AtKeyword, strValue);
        }
        else {
            return this.scanCharacter();
        }
    }
    assertCondition(status, errorMessage) {
        if (!status) {
            this.error(errorMessage);
            return true;
        }
        return false;
    }
    error(message, errorTokenValue = null, doNotAdvance = false) {
        var index = this.index;
        var column = this.column;
        var line = this.line;
        errorTokenValue =
            errorTokenValue ? errorTokenValue : String.fromCharCode(this.peek);
        var invalidToken = new CssToken(index, column, line, CssTokenType.Invalid, errorTokenValue);
        var errorMessage = generateErrorMessage(this.input, message, errorTokenValue, index, line, column);
        if (!doNotAdvance) {
            this.advance();
        }
        this._currentError = new CssScannerError(invalidToken, errorMessage);
        return invalidToken;
    }
}
function isCharMatch(target, previous, code) {
    return code == target && previous != chars.$BACKSLASH;
}
function isCommentStart(code, next) {
    return code == chars.$SLASH && next == chars.$STAR;
}
function isCommentEnd(code, next) {
    return code == chars.$STAR && next == chars.$SLASH;
}
function isStringStart(code, next) {
    var target = code;
    if (target == chars.$BACKSLASH) {
        target = next;
    }
    return target == chars.$DQ || target == chars.$SQ;
}
function isIdentifierStart(code, next) {
    var target = code;
    if (target == chars.$MINUS) {
        target = next;
    }
    return chars.isAsciiLetter(target) || target == chars.$BACKSLASH || target == chars.$MINUS ||
        target == chars.$_;
}
function isIdentifierPart(target) {
    return chars.isAsciiLetter(target) || target == chars.$BACKSLASH || target == chars.$MINUS ||
        target == chars.$_ || chars.isDigit(target);
}
function isValidPseudoSelectorCharacter(code) {
    switch (code) {
        case chars.$LPAREN:
        case chars.$RPAREN:
            return true;
        default:
            return false;
    }
}
function isValidKeyframeBlockCharacter(code) {
    return code == chars.$PERCENT;
}
function isValidAttributeSelectorCharacter(code) {
    // value^*|$~=something
    switch (code) {
        case chars.$$:
        case chars.$PIPE:
        case chars.$CARET:
        case chars.$TILDA:
        case chars.$STAR:
        case chars.$EQ:
            return true;
        default:
            return false;
    }
}
function isValidSelectorCharacter(code) {
    // selector [ key   = value ]
    // IDENT    C IDENT C IDENT C
    // #id, .class, *+~>
    // tag:PSEUDO
    switch (code) {
        case chars.$HASH:
        case chars.$PERIOD:
        case chars.$TILDA:
        case chars.$STAR:
        case chars.$PLUS:
        case chars.$GT:
        case chars.$COLON:
        case chars.$PIPE:
        case chars.$COMMA:
        case chars.$LBRACKET:
        case chars.$RBRACKET:
            return true;
        default:
            return false;
    }
}
function isValidStyleBlockCharacter(code) {
    // key:value;
    // key:calc(something ... )
    switch (code) {
        case chars.$HASH:
        case chars.$SEMICOLON:
        case chars.$COLON:
        case chars.$PERCENT:
        case chars.$SLASH:
        case chars.$BACKSLASH:
        case chars.$BANG:
        case chars.$PERIOD:
        case chars.$LPAREN:
        case chars.$RPAREN:
            return true;
        default:
            return false;
    }
}
function isValidMediaQueryRuleCharacter(code) {
    // (min-width: 7.5em) and (orientation: landscape)
    switch (code) {
        case chars.$LPAREN:
        case chars.$RPAREN:
        case chars.$COLON:
        case chars.$PERCENT:
        case chars.$PERIOD:
            return true;
        default:
            return false;
    }
}
function isValidAtRuleCharacter(code) {
    // @document url(http://www.w3.org/page?something=on#hash),
    switch (code) {
        case chars.$LPAREN:
        case chars.$RPAREN:
        case chars.$COLON:
        case chars.$PERCENT:
        case chars.$PERIOD:
        case chars.$SLASH:
        case chars.$BACKSLASH:
        case chars.$HASH:
        case chars.$EQ:
        case chars.$QUESTION:
        case chars.$AMPERSAND:
        case chars.$STAR:
        case chars.$COMMA:
        case chars.$MINUS:
        case chars.$PLUS:
            return true;
        default:
            return false;
    }
}
function isValidStyleFunctionCharacter(code) {
    switch (code) {
        case chars.$PERIOD:
        case chars.$MINUS:
        case chars.$PLUS:
        case chars.$STAR:
        case chars.$SLASH:
        case chars.$LPAREN:
        case chars.$RPAREN:
        case chars.$COMMA:
            return true;
        default:
            return false;
    }
}
function isValidBlockCharacter(code) {
    // @something { }
    // IDENT
    return code == chars.$AT;
}
function isValidCssCharacter(code, mode) {
    switch (mode) {
        case CssLexerMode.ALL:
        case CssLexerMode.ALL_TRACK_WS:
            return true;
        case CssLexerMode.SELECTOR:
            return isValidSelectorCharacter(code);
        case CssLexerMode.PSEUDO_SELECTOR_WITH_ARGUMENTS:
            return isValidPseudoSelectorCharacter(code);
        case CssLexerMode.ATTRIBUTE_SELECTOR:
            return isValidAttributeSelectorCharacter(code);
        case CssLexerMode.MEDIA_QUERY:
            return isValidMediaQueryRuleCharacter(code);
        case CssLexerMode.AT_RULE_QUERY:
            return isValidAtRuleCharacter(code);
        case CssLexerMode.KEYFRAME_BLOCK:
            return isValidKeyframeBlockCharacter(code);
        case CssLexerMode.STYLE_BLOCK:
        case CssLexerMode.STYLE_VALUE:
            return isValidStyleBlockCharacter(code);
        case CssLexerMode.STYLE_CALC_FUNCTION:
            return isValidStyleFunctionCharacter(code);
        case CssLexerMode.BLOCK:
            return isValidBlockCharacter(code);
        default:
            return false;
    }
}
function charCode(input, index) {
    return index >= input.length ? chars.$EOF : input.charCodeAt(index);
}
function charStr(code) {
    return String.fromCharCode(code);
}
export function isNewline(code) {
    switch (code) {
        case chars.$FF:
        case chars.$CR:
        case chars.$LF:
        case chars.$VTAB:
            return true;
        default:
            return false;
    }
}
//# sourceMappingURL=css-lexer.js.map