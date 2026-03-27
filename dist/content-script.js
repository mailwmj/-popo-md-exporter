// src/lib/extractor.ts
var TITLE_FALLBACK = "\u672A\u547D\u540D\u6587\u6863";
function getAccessibleDocument(frameWindow) {
  if (!frameWindow) {
    return null;
  }
  try {
    return frameWindow.document;
  } catch {
    return null;
  }
}
function getFrameDocuments() {
  const documents = [document];
  const frames = Array.from(document.querySelectorAll("iframe"));
  for (const frame of frames) {
    const frameDocument = getAccessibleDocument(frame.contentWindow);
    if (frameDocument) {
      documents.push(frameDocument);
    }
  }
  return documents;
}
function isEditorHostDocument(doc) {
  const url = doc.defaultView?.location.href ?? "";
  return url.includes("office.netease.com") || url.includes("lingxi") || doc === document;
}
function getEligibleDocuments() {
  return getFrameDocuments().filter(isEditorHostDocument);
}
function getTitle() {
  const titleElement = document.querySelector("#BULB_DOC_TITLE .editableDiv_olWBIm");
  const titleText = titleElement?.textContent?.trim();
  if (titleText) {
    return titleText;
  }
  const pageTitle = document.title.replace(/\s*[-–—]\s*POPO.*$/i, "").trim();
  return pageTitle || TITLE_FALLBACK;
}
function findMarkdownHtml(doc) {
  const editor = doc.querySelector('.ProseMirror.editor, .ProseMirror[class*="editor"]');
  const html = editor?.innerHTML?.trim();
  return html && html.length > 50 ? html : null;
}
function findRichTextHtml(doc) {
  const editor = doc.querySelector(".bulb-editor.bulb-editor-inner");
  const html = editor?.innerHTML?.trim();
  return html && html.length > 50 ? html : null;
}
function checkPopoPageEligibility() {
  const hostname = window.location.hostname;
  if (!hostname.includes("popo.netease.com") && !hostname.includes("office.netease.com")) {
    return { ok: false, reason: "\u5F53\u524D\u9875\u9762\u4E0D\u662F POPO \u6587\u6863\u9875\u9762" };
  }
  if (window.location.href.includes("/login") || window.location.href.includes("/signin")) {
    return { ok: false, reason: "\u8BF7\u5148\u767B\u5F55 POPO \u6587\u6863\u540E\u518D\u8BD5" };
  }
  return { ok: true };
}
function extractPopoDocumentHtml() {
  const docs = getEligibleDocuments();
  for (const doc of docs) {
    const markdownHtml = findMarkdownHtml(doc);
    if (markdownHtml) {
      return {
        title: getTitle(),
        html: markdownHtml,
        source: "markdown"
      };
    }
  }
  for (const doc of docs) {
    const richTextHtml = findRichTextHtml(doc);
    if (richTextHtml) {
      return {
        title: getTitle(),
        html: richTextHtml,
        source: "richtext"
      };
    }
  }
  throw new Error("\u672A\u627E\u5230\u53EF\u8BBF\u95EE\u7684\u6B63\u6587\u533A\u57DF");
}

// node_modules/turndown/lib/turndown.browser.es.js
function extend(destination) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];
    for (var key in source) {
      if (source.hasOwnProperty(key)) destination[key] = source[key];
    }
  }
  return destination;
}
function repeat(character, count) {
  return Array(count + 1).join(character);
}
function trimLeadingNewlines(string) {
  return string.replace(/^\n*/, "");
}
function trimTrailingNewlines(string) {
  var indexEnd = string.length;
  while (indexEnd > 0 && string[indexEnd - 1] === "\n") indexEnd--;
  return string.substring(0, indexEnd);
}
function trimNewlines(string) {
  return trimTrailingNewlines(trimLeadingNewlines(string));
}
var blockElements = [
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "AUDIO",
  "BLOCKQUOTE",
  "BODY",
  "CANVAS",
  "CENTER",
  "DD",
  "DIR",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "FRAMESET",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HGROUP",
  "HR",
  "HTML",
  "ISINDEX",
  "LI",
  "MAIN",
  "MENU",
  "NAV",
  "NOFRAMES",
  "NOSCRIPT",
  "OL",
  "OUTPUT",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL"
];
function isBlock(node) {
  return is(node, blockElements);
}
var voidElements = [
  "AREA",
  "BASE",
  "BR",
  "COL",
  "COMMAND",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "KEYGEN",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR"
];
function isVoid(node) {
  return is(node, voidElements);
}
function hasVoid(node) {
  return has(node, voidElements);
}
var meaningfulWhenBlankElements = [
  "A",
  "TABLE",
  "THEAD",
  "TBODY",
  "TFOOT",
  "TH",
  "TD",
  "IFRAME",
  "SCRIPT",
  "AUDIO",
  "VIDEO"
];
function isMeaningfulWhenBlank(node) {
  return is(node, meaningfulWhenBlankElements);
}
function hasMeaningfulWhenBlank(node) {
  return has(node, meaningfulWhenBlankElements);
}
function is(node, tagNames) {
  return tagNames.indexOf(node.nodeName) >= 0;
}
function has(node, tagNames) {
  return node.getElementsByTagName && tagNames.some(function(tagName) {
    return node.getElementsByTagName(tagName).length;
  });
}
var rules = {};
rules.paragraph = {
  filter: "p",
  replacement: function(content) {
    return "\n\n" + content + "\n\n";
  }
};
rules.lineBreak = {
  filter: "br",
  replacement: function(content, node, options) {
    return options.br + "\n";
  }
};
rules.heading = {
  filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
  replacement: function(content, node, options) {
    var hLevel = Number(node.nodeName.charAt(1));
    if (options.headingStyle === "setext" && hLevel < 3) {
      var underline = repeat(hLevel === 1 ? "=" : "-", content.length);
      return "\n\n" + content + "\n" + underline + "\n\n";
    } else {
      return "\n\n" + repeat("#", hLevel) + " " + content + "\n\n";
    }
  }
};
rules.blockquote = {
  filter: "blockquote",
  replacement: function(content) {
    content = trimNewlines(content).replace(/^/gm, "> ");
    return "\n\n" + content + "\n\n";
  }
};
rules.list = {
  filter: ["ul", "ol"],
  replacement: function(content, node) {
    var parent = node.parentNode;
    if (parent.nodeName === "LI" && parent.lastElementChild === node) {
      return "\n" + content;
    } else {
      return "\n\n" + content + "\n\n";
    }
  }
};
rules.listItem = {
  filter: "li",
  replacement: function(content, node, options) {
    var prefix = options.bulletListMarker + "   ";
    var parent = node.parentNode;
    if (parent.nodeName === "OL") {
      var start = parent.getAttribute("start");
      var index = Array.prototype.indexOf.call(parent.children, node);
      prefix = (start ? Number(start) + index : index + 1) + ".  ";
    }
    var isParagraph = /\n$/.test(content);
    content = trimNewlines(content) + (isParagraph ? "\n" : "");
    content = content.replace(/\n/gm, "\n" + " ".repeat(prefix.length));
    return prefix + content + (node.nextSibling ? "\n" : "");
  }
};
rules.indentedCodeBlock = {
  filter: function(node, options) {
    return options.codeBlockStyle === "indented" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
  },
  replacement: function(content, node, options) {
    return "\n\n    " + node.firstChild.textContent.replace(/\n/g, "\n    ") + "\n\n";
  }
};
rules.fencedCodeBlock = {
  filter: function(node, options) {
    return options.codeBlockStyle === "fenced" && node.nodeName === "PRE" && node.firstChild && node.firstChild.nodeName === "CODE";
  },
  replacement: function(content, node, options) {
    var className = node.firstChild.getAttribute("class") || "";
    var language = (className.match(/language-(\S+)/) || [null, ""])[1];
    var code = node.firstChild.textContent;
    var fenceChar = options.fence.charAt(0);
    var fenceSize = 3;
    var fenceInCodeRegex = new RegExp("^" + fenceChar + "{3,}", "gm");
    var match;
    while (match = fenceInCodeRegex.exec(code)) {
      if (match[0].length >= fenceSize) {
        fenceSize = match[0].length + 1;
      }
    }
    var fence = repeat(fenceChar, fenceSize);
    return "\n\n" + fence + language + "\n" + code.replace(/\n$/, "") + "\n" + fence + "\n\n";
  }
};
rules.horizontalRule = {
  filter: "hr",
  replacement: function(content, node, options) {
    return "\n\n" + options.hr + "\n\n";
  }
};
rules.inlineLink = {
  filter: function(node, options) {
    return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href");
  },
  replacement: function(content, node) {
    var href = node.getAttribute("href");
    if (href) href = href.replace(/([()])/g, "\\$1");
    var title = cleanAttribute(node.getAttribute("title"));
    if (title) title = ' "' + title.replace(/"/g, '\\"') + '"';
    return "[" + content + "](" + href + title + ")";
  }
};
rules.referenceLink = {
  filter: function(node, options) {
    return options.linkStyle === "referenced" && node.nodeName === "A" && node.getAttribute("href");
  },
  replacement: function(content, node, options) {
    var href = node.getAttribute("href");
    var title = cleanAttribute(node.getAttribute("title"));
    if (title) title = ' "' + title + '"';
    var replacement;
    var reference;
    switch (options.linkReferenceStyle) {
      case "collapsed":
        replacement = "[" + content + "][]";
        reference = "[" + content + "]: " + href + title;
        break;
      case "shortcut":
        replacement = "[" + content + "]";
        reference = "[" + content + "]: " + href + title;
        break;
      default:
        var id = this.references.length + 1;
        replacement = "[" + content + "][" + id + "]";
        reference = "[" + id + "]: " + href + title;
    }
    this.references.push(reference);
    return replacement;
  },
  references: [],
  append: function(options) {
    var references = "";
    if (this.references.length) {
      references = "\n\n" + this.references.join("\n") + "\n\n";
      this.references = [];
    }
    return references;
  }
};
rules.emphasis = {
  filter: ["em", "i"],
  replacement: function(content, node, options) {
    if (!content.trim()) return "";
    return options.emDelimiter + content + options.emDelimiter;
  }
};
rules.strong = {
  filter: ["strong", "b"],
  replacement: function(content, node, options) {
    if (!content.trim()) return "";
    return options.strongDelimiter + content + options.strongDelimiter;
  }
};
rules.code = {
  filter: function(node) {
    var hasSiblings = node.previousSibling || node.nextSibling;
    var isCodeBlock = node.parentNode.nodeName === "PRE" && !hasSiblings;
    return node.nodeName === "CODE" && !isCodeBlock;
  },
  replacement: function(content) {
    if (!content) return "";
    content = content.replace(/\r?\n|\r/g, " ");
    var extraSpace = /^`|^ .*?[^ ].* $|`$/.test(content) ? " " : "";
    var delimiter = "`";
    var matches = content.match(/`+/gm) || [];
    while (matches.indexOf(delimiter) !== -1) delimiter = delimiter + "`";
    return delimiter + extraSpace + content + extraSpace + delimiter;
  }
};
rules.image = {
  filter: "img",
  replacement: function(content, node) {
    var alt = cleanAttribute(node.getAttribute("alt"));
    var src = node.getAttribute("src") || "";
    var title = cleanAttribute(node.getAttribute("title"));
    var titlePart = title ? ' "' + title + '"' : "";
    return src ? "![" + alt + "](" + src + titlePart + ")" : "";
  }
};
function cleanAttribute(attribute) {
  return attribute ? attribute.replace(/(\n+\s*)+/g, "\n") : "";
}
function Rules(options) {
  this.options = options;
  this._keep = [];
  this._remove = [];
  this.blankRule = {
    replacement: options.blankReplacement
  };
  this.keepReplacement = options.keepReplacement;
  this.defaultRule = {
    replacement: options.defaultReplacement
  };
  this.array = [];
  for (var key in options.rules) this.array.push(options.rules[key]);
}
Rules.prototype = {
  add: function(key, rule) {
    this.array.unshift(rule);
  },
  keep: function(filter) {
    this._keep.unshift({
      filter,
      replacement: this.keepReplacement
    });
  },
  remove: function(filter) {
    this._remove.unshift({
      filter,
      replacement: function() {
        return "";
      }
    });
  },
  forNode: function(node) {
    if (node.isBlank) return this.blankRule;
    var rule;
    if (rule = findRule(this.array, node, this.options)) return rule;
    if (rule = findRule(this._keep, node, this.options)) return rule;
    if (rule = findRule(this._remove, node, this.options)) return rule;
    return this.defaultRule;
  },
  forEach: function(fn) {
    for (var i = 0; i < this.array.length; i++) fn(this.array[i], i);
  }
};
function findRule(rules2, node, options) {
  for (var i = 0; i < rules2.length; i++) {
    var rule = rules2[i];
    if (filterValue(rule, node, options)) return rule;
  }
  return void 0;
}
function filterValue(rule, node, options) {
  var filter = rule.filter;
  if (typeof filter === "string") {
    if (filter === node.nodeName.toLowerCase()) return true;
  } else if (Array.isArray(filter)) {
    if (filter.indexOf(node.nodeName.toLowerCase()) > -1) return true;
  } else if (typeof filter === "function") {
    if (filter.call(rule, node, options)) return true;
  } else {
    throw new TypeError("`filter` needs to be a string, array, or function");
  }
}
function collapseWhitespace(options) {
  var element = options.element;
  var isBlock2 = options.isBlock;
  var isVoid2 = options.isVoid;
  var isPre = options.isPre || function(node2) {
    return node2.nodeName === "PRE";
  };
  if (!element.firstChild || isPre(element)) return;
  var prevText = null;
  var keepLeadingWs = false;
  var prev = null;
  var node = next(prev, element, isPre);
  while (node !== element) {
    if (node.nodeType === 3 || node.nodeType === 4) {
      var text = node.data.replace(/[ \r\n\t]+/g, " ");
      if ((!prevText || / $/.test(prevText.data)) && !keepLeadingWs && text[0] === " ") {
        text = text.substr(1);
      }
      if (!text) {
        node = remove(node);
        continue;
      }
      node.data = text;
      prevText = node;
    } else if (node.nodeType === 1) {
      if (isBlock2(node) || node.nodeName === "BR") {
        if (prevText) {
          prevText.data = prevText.data.replace(/ $/, "");
        }
        prevText = null;
        keepLeadingWs = false;
      } else if (isVoid2(node) || isPre(node)) {
        prevText = null;
        keepLeadingWs = true;
      } else if (prevText) {
        keepLeadingWs = false;
      }
    } else {
      node = remove(node);
      continue;
    }
    var nextNode = next(prev, node, isPre);
    prev = node;
    node = nextNode;
  }
  if (prevText) {
    prevText.data = prevText.data.replace(/ $/, "");
    if (!prevText.data) {
      remove(prevText);
    }
  }
}
function remove(node) {
  var next2 = node.nextSibling || node.parentNode;
  node.parentNode.removeChild(node);
  return next2;
}
function next(prev, current, isPre) {
  if (prev && prev.parentNode === current || isPre(current)) {
    return current.nextSibling || current.parentNode;
  }
  return current.firstChild || current.nextSibling || current.parentNode;
}
var root = typeof window !== "undefined" ? window : {};
function canParseHTMLNatively() {
  var Parser = root.DOMParser;
  var canParse = false;
  try {
    if (new Parser().parseFromString("", "text/html")) {
      canParse = true;
    }
  } catch (e) {
  }
  return canParse;
}
function createHTMLParser() {
  var Parser = function() {
  };
  {
    if (shouldUseActiveX()) {
      Parser.prototype.parseFromString = function(string) {
        var doc = new window.ActiveXObject("htmlfile");
        doc.designMode = "on";
        doc.open();
        doc.write(string);
        doc.close();
        return doc;
      };
    } else {
      Parser.prototype.parseFromString = function(string) {
        var doc = document.implementation.createHTMLDocument("");
        doc.open();
        doc.write(string);
        doc.close();
        return doc;
      };
    }
  }
  return Parser;
}
function shouldUseActiveX() {
  var useActiveX = false;
  try {
    document.implementation.createHTMLDocument("").open();
  } catch (e) {
    if (root.ActiveXObject) useActiveX = true;
  }
  return useActiveX;
}
var HTMLParser = canParseHTMLNatively() ? root.DOMParser : createHTMLParser();
function RootNode(input, options) {
  var root2;
  if (typeof input === "string") {
    var doc = htmlParser().parseFromString(
      // DOM parsers arrange elements in the <head> and <body>.
      // Wrapping in a custom element ensures elements are reliably arranged in
      // a single element.
      '<x-turndown id="turndown-root">' + input + "</x-turndown>",
      "text/html"
    );
    root2 = doc.getElementById("turndown-root");
  } else {
    root2 = input.cloneNode(true);
  }
  collapseWhitespace({
    element: root2,
    isBlock,
    isVoid,
    isPre: options.preformattedCode ? isPreOrCode : null
  });
  return root2;
}
var _htmlParser;
function htmlParser() {
  _htmlParser = _htmlParser || new HTMLParser();
  return _htmlParser;
}
function isPreOrCode(node) {
  return node.nodeName === "PRE" || node.nodeName === "CODE";
}
function Node(node, options) {
  node.isBlock = isBlock(node);
  node.isCode = node.nodeName === "CODE" || node.parentNode.isCode;
  node.isBlank = isBlank(node);
  node.flankingWhitespace = flankingWhitespace(node, options);
  return node;
}
function isBlank(node) {
  return !isVoid(node) && !isMeaningfulWhenBlank(node) && /^\s*$/i.test(node.textContent) && !hasVoid(node) && !hasMeaningfulWhenBlank(node);
}
function flankingWhitespace(node, options) {
  if (node.isBlock || options.preformattedCode && node.isCode) {
    return { leading: "", trailing: "" };
  }
  var edges = edgeWhitespace(node.textContent);
  if (edges.leadingAscii && isFlankedByWhitespace("left", node, options)) {
    edges.leading = edges.leadingNonAscii;
  }
  if (edges.trailingAscii && isFlankedByWhitespace("right", node, options)) {
    edges.trailing = edges.trailingNonAscii;
  }
  return { leading: edges.leading, trailing: edges.trailing };
}
function edgeWhitespace(string) {
  var m = string.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
  return {
    leading: m[1],
    // whole string for whitespace-only strings
    leadingAscii: m[2],
    leadingNonAscii: m[3],
    trailing: m[4],
    // empty for whitespace-only strings
    trailingNonAscii: m[5],
    trailingAscii: m[6]
  };
}
function isFlankedByWhitespace(side, node, options) {
  var sibling;
  var regExp;
  var isFlanked;
  if (side === "left") {
    sibling = node.previousSibling;
    regExp = / $/;
  } else {
    sibling = node.nextSibling;
    regExp = /^ /;
  }
  if (sibling) {
    if (sibling.nodeType === 3) {
      isFlanked = regExp.test(sibling.nodeValue);
    } else if (options.preformattedCode && sibling.nodeName === "CODE") {
      isFlanked = false;
    } else if (sibling.nodeType === 1 && !isBlock(sibling)) {
      isFlanked = regExp.test(sibling.textContent);
    }
  }
  return isFlanked;
}
var reduce = Array.prototype.reduce;
var escapes = [
  [/\\/g, "\\\\"],
  [/\*/g, "\\*"],
  [/^-/g, "\\-"],
  [/^\+ /g, "\\+ "],
  [/^(=+)/g, "\\$1"],
  [/^(#{1,6}) /g, "\\$1 "],
  [/`/g, "\\`"],
  [/^~~~/g, "\\~~~"],
  [/\[/g, "\\["],
  [/\]/g, "\\]"],
  [/^>/g, "\\>"],
  [/_/g, "\\_"],
  [/^(\d+)\. /g, "$1\\. "]
];
function TurndownService(options) {
  if (!(this instanceof TurndownService)) return new TurndownService(options);
  var defaults = {
    rules,
    headingStyle: "setext",
    hr: "* * *",
    bulletListMarker: "*",
    codeBlockStyle: "indented",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    br: "  ",
    preformattedCode: false,
    blankReplacement: function(content, node) {
      return node.isBlock ? "\n\n" : "";
    },
    keepReplacement: function(content, node) {
      return node.isBlock ? "\n\n" + node.outerHTML + "\n\n" : node.outerHTML;
    },
    defaultReplacement: function(content, node) {
      return node.isBlock ? "\n\n" + content + "\n\n" : content;
    }
  };
  this.options = extend({}, defaults, options);
  this.rules = new Rules(this.options);
}
TurndownService.prototype = {
  /**
   * The entry point for converting a string or DOM node to Markdown
   * @public
   * @param {String|HTMLElement} input The string or DOM node to convert
   * @returns A Markdown representation of the input
   * @type String
   */
  turndown: function(input) {
    if (!canConvert(input)) {
      throw new TypeError(
        input + " is not a string, or an element/document/fragment node."
      );
    }
    if (input === "") return "";
    var output = process.call(this, new RootNode(input, this.options));
    return postProcess.call(this, output);
  },
  /**
   * Add one or more plugins
   * @public
   * @param {Function|Array} plugin The plugin or array of plugins to add
   * @returns The Turndown instance for chaining
   * @type Object
   */
  use: function(plugin) {
    if (Array.isArray(plugin)) {
      for (var i = 0; i < plugin.length; i++) this.use(plugin[i]);
    } else if (typeof plugin === "function") {
      plugin(this);
    } else {
      throw new TypeError("plugin must be a Function or an Array of Functions");
    }
    return this;
  },
  /**
   * Adds a rule
   * @public
   * @param {String} key The unique key of the rule
   * @param {Object} rule The rule
   * @returns The Turndown instance for chaining
   * @type Object
   */
  addRule: function(key, rule) {
    this.rules.add(key, rule);
    return this;
  },
  /**
   * Keep a node (as HTML) that matches the filter
   * @public
   * @param {String|Array|Function} filter The unique key of the rule
   * @returns The Turndown instance for chaining
   * @type Object
   */
  keep: function(filter) {
    this.rules.keep(filter);
    return this;
  },
  /**
   * Remove a node that matches the filter
   * @public
   * @param {String|Array|Function} filter The unique key of the rule
   * @returns The Turndown instance for chaining
   * @type Object
   */
  remove: function(filter) {
    this.rules.remove(filter);
    return this;
  },
  /**
   * Escapes Markdown syntax
   * @public
   * @param {String} string The string to escape
   * @returns A string with Markdown syntax escaped
   * @type String
   */
  escape: function(string) {
    return escapes.reduce(function(accumulator, escape) {
      return accumulator.replace(escape[0], escape[1]);
    }, string);
  }
};
function process(parentNode) {
  var self = this;
  return reduce.call(parentNode.childNodes, function(output, node) {
    node = new Node(node, self.options);
    var replacement = "";
    if (node.nodeType === 3) {
      replacement = node.isCode ? node.nodeValue : self.escape(node.nodeValue);
    } else if (node.nodeType === 1) {
      replacement = replacementForNode.call(self, node);
    }
    return join(output, replacement);
  }, "");
}
function postProcess(output) {
  var self = this;
  this.rules.forEach(function(rule) {
    if (typeof rule.append === "function") {
      output = join(output, rule.append(self.options));
    }
  });
  return output.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "");
}
function replacementForNode(node) {
  var rule = this.rules.forNode(node);
  var content = process.call(this, node);
  var whitespace = node.flankingWhitespace;
  if (whitespace.leading || whitespace.trailing) content = content.trim();
  return whitespace.leading + rule.replacement(content, node, this.options) + whitespace.trailing;
}
function join(output, replacement) {
  var s1 = trimTrailingNewlines(output);
  var s2 = trimLeadingNewlines(replacement);
  var nls = Math.max(output.length - s1.length, replacement.length - s2.length);
  var separator = "\n\n".substring(0, nls);
  return s1 + separator + s2;
}
function canConvert(input) {
  return input != null && (typeof input === "string" || input.nodeType && (input.nodeType === 1 || input.nodeType === 9 || input.nodeType === 11));
}
var turndown_browser_es_default = TurndownService;

// src/lib/converter.ts
function normalizeImageUrl(src) {
  const trimmed = src.trim();
  if (!trimmed || trimmed.startsWith("data:image")) {
    return "";
  }
  try {
    return new URL(trimmed, "https://office.netease.com").toString().replace(/ /g, "%20");
  } catch {
    return trimmed.replace(/ /g, "%20");
  }
}
function createBaseTurndownService() {
  const service = new turndown_browser_es_default({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "*",
    strongDelimiter: "**",
    fence: "```",
    linkStyle: "inlined",
    preformattedCode: false
  });
  service.escape = (text) => text;
  return service;
}
function collectImageAsset(images, src, alt, title) {
  const placeholder = `__POPO_IMAGE_${images.length}__`;
  images.push({
    placeholder,
    src,
    alt,
    title
  });
  return placeholder;
}
function buildImagePlaceholder(images, src, alt, title) {
  if (!src) {
    return "";
  }
  return collectImageAsset(images, src, alt || "\u56FE\u50CF", title);
}
function createCellConverter(images) {
  const cellConverter = new turndown_browser_es_default({
    headingStyle: "atx",
    codeBlockStyle: "fenced"
  });
  cellConverter.addRule("cellImage", {
    filter: "img",
    replacement: (_content, node) => {
      const img = node;
      const src = normalizeImageUrl(img.getAttribute("src") || "");
      const alt = img.getAttribute("alt") || img.getAttribute("title") || "\u56FE\u50CF";
      const title = img.getAttribute("title") || void 0;
      return buildImagePlaceholder(images, src, alt, title);
    }
  });
  cellConverter.addRule("cellTodo", {
    filter: (node) => node.nodeName === "DIV" && node.getAttribute("data-block-type") === "todo",
    replacement: (_content, node) => {
      const element = node;
      const checked = element.querySelector("[data-todo-label]")?.getAttribute("data-todo-label") === "true";
      const textContent = Array.from(element.querySelectorAll("span[data-bulb-node-id]")).map((span) => span.textContent?.trim()).filter(Boolean).join(" ");
      return `- ${checked ? "[x]" : "[ ]"} ${textContent}
`;
    }
  });
  cellConverter.addRule("cellOrderedList", {
    filter: (node) => node.nodeName === "OL" && node.getAttribute("data-block-type") === "list-item",
    replacement: (_content, node) => {
      const element = node;
      const placeholder = element.querySelector(".item-list-placeholder");
      const number = (placeholder?.textContent?.trim() || "1.").replace(".", "");
      const textContent = element.querySelector("li")?.textContent?.trim() || "";
      return `${number}.  ${textContent}
`;
    }
  });
  cellConverter.addRule("cellUnorderedList", {
    filter: (node) => node.nodeName === "UL" && node.getAttribute("data-block-type") === "list-item",
    replacement: (_content, node) => {
      const textContent = node.querySelector("li")?.textContent?.trim() || "";
      return `-   ${textContent}
`;
    }
  });
  cellConverter.addRule("cellCodeBlock", {
    filter: (node) => node.nodeName === "DIV" && node.getAttribute("data-block-type") === "code",
    replacement: (_content, node) => {
      const element = node;
      const language = element.querySelector(".code-language-change-btn > span")?.textContent?.trim() || "";
      const codeText = Array.from(element.querySelectorAll('pre[data-block-type="code-line"]')).map((line) => line.querySelector("code")?.textContent || "").join("\n");
      if (!codeText) {
        return "";
      }
      return language ? `\`\`\`${language}
${codeText}
\`\`\`
` : `\`\`\`
${codeText}
\`\`\`
`;
    }
  });
  return cellConverter;
}
function registerMarkdownRules(service, images) {
  service.addRule("removeStyle", {
    filter: ["style"],
    replacement: () => ""
  });
  service.addRule("removeScript", {
    filter: ["script"],
    replacement: () => ""
  });
  service.addRule("removeSvg", {
    filter: (node) => node.nodeName === "svg" || node.nodeName === "SVG",
    replacement: () => ""
  });
  service.addRule("mermaidDiagram", {
    filter: (node) => {
      if (node.nodeName !== "DIV") return false;
      const element = node;
      const className = element.getAttribute("class") || "";
      return className.includes("mermaid") && className.includes("diagram") || element.hasAttribute("data-value") && element.getAttribute("data-type") === "diagram";
    },
    replacement: (_content, node) => {
      const element = node;
      let dataValue = element.getAttribute("data-value");
      if (!dataValue) {
        const innerNode = element.querySelector("[data-value]");
        dataValue = innerNode?.getAttribute("data-value") || "";
      }
      if (dataValue) {
        const decoded = dataValue.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
        return `
\`\`\`mermaid
${decoded}
\`\`\`
`;
      }
      const proseMirror = element.querySelector(".ProseMirror");
      if (proseMirror?.textContent) {
        return `
\`\`\`mermaid
${proseMirror.textContent}
\`\`\`
`;
      }
      return "";
    }
  });
  service.addRule("codeFence", {
    filter: (node) => {
      if (node.nodeName !== "DIV") return false;
      const element = node;
      const className = element.getAttribute("class") || "";
      return className.includes("code-fence") && !className.includes("code-fence_selector");
    },
    replacement: (_content, node) => {
      const element = node;
      const language = element.getAttribute("data-language") || "";
      const langTag = language === "null" || !language ? "" : language;
      const codeDiv = element.querySelector("pre code div");
      const fallbackCode = element.querySelector("pre code");
      const rawCode = codeDiv?.textContent || fallbackCode?.textContent || "";
      const codeContent = rawCode.replace(/\n$/, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").trim();
      return codeContent ? `
\`\`\`${langTag}
${codeContent}
\`\`\`
` : "";
    }
  });
  service.addRule("imageContainer", {
    filter: (node) => {
      if (node.nodeName !== "SPAN") return false;
      const element = node;
      return (element.getAttribute("class") || "").includes("image-container");
    },
    replacement: (_content, node) => {
      const img = node.querySelector("img");
      const src = normalizeImageUrl(img?.getAttribute("src") || "");
      const alt = img?.getAttribute("alt") || img?.getAttribute("title") || "\u56FE\u50CF";
      const title = img?.getAttribute("title") || void 0;
      return buildImagePlaceholder(images, src, alt, title);
    }
  });
  service.addRule("horizontalRule", {
    filter: (node) => node.nodeName === "HR",
    replacement: () => "\n***\n"
  });
  service.addRule("removeDecorations", {
    filter: (node) => {
      if (!["DIV", "SPAN", "IMG", "BR"].includes(node.nodeName)) return false;
      const element = node;
      const className = element.getAttribute("class") || "";
      if (className.includes("image-container")) return false;
      if (className.includes("code-fence") && !className.includes("code-fence_selector")) return false;
      return className.includes("milkdown-") || className.includes("list-item_label") || className.includes("icon") || className.includes("placeholder") || className.includes("separator") || className.includes("trailingBreak") || className === "ProseMirror-separator";
    },
    replacement: () => ""
  });
}
function registerRichTextRules(service, images) {
  service.addRule("removeStyleScript", {
    filter: ["style", "script"],
    replacement: () => ""
  });
  service.addRule("filterBase64Images", {
    filter: "img",
    replacement: (_content, node) => {
      const img = node;
      const src = normalizeImageUrl(img.getAttribute("src") || "");
      const alt = img.getAttribute("alt") || img.getAttribute("title") || "\u56FE\u50CF";
      const title = img.getAttribute("title") || void 0;
      return buildImagePlaceholder(images, src, alt, title);
    }
  });
  service.addRule("bulbHeading", {
    filter: (node) => node.nodeName === "DIV" && (node.getAttribute("class") || "").includes("bulb-heading"),
    replacement: (content, node) => {
      const level = node.getAttribute("data-heading-level") || "h1";
      return `
${"#".repeat(Number.parseInt(level.replace("h", ""), 10))} ${content}
`;
    }
  });
  service.addRule("bulbTodo", {
    filter: (node) => node.nodeName === "DIV" && node.getAttribute("data-block-type") === "todo",
    replacement: (_content, node) => {
      const element = node;
      const checked = element.querySelector("[data-todo-label]")?.getAttribute("data-todo-label") === "true";
      const textContent = Array.from(element.querySelectorAll("span[data-bulb-node-id]")).map((span) => span.textContent?.trim()).filter(Boolean).join(" ");
      return `- ${checked ? "[x]" : "[ ]"} ${textContent}
`;
    }
  });
  service.addRule("bulbImage", {
    filter: (node) => {
      if (node.nodeName !== "DIV") return false;
      const element = node;
      if (element.getAttribute("data-block-type") !== "image") return false;
      let parent = element.parentElement;
      while (parent) {
        if (parent.classList.contains("diagram-template")) {
          return false;
        }
        parent = parent.parentElement;
      }
      return true;
    },
    replacement: (_content, node) => {
      const img = node.querySelector("img");
      const src = normalizeImageUrl(img?.getAttribute("src") || "");
      const alt = img?.getAttribute("alt") || img?.getAttribute("title") || "\u56FE\u50CF";
      const title = img?.getAttribute("title") || void 0;
      const placeholder = buildImagePlaceholder(images, src, alt, title);
      return placeholder ? `
${placeholder}
` : "";
    }
  });
  service.addRule("bulbTable", {
    filter: (node) => node.nodeName === "DIV" && node.getAttribute("data-block-type") === "table",
    replacement: (_content, node) => {
      const table = node.querySelector("table");
      if (!table) {
        return "";
      }
      const rows = Array.from(table.querySelectorAll('tr[data-block-type="table-row"]'));
      if (rows.length === 0) {
        return "";
      }
      const cellConverter = createCellConverter(images);
      const tableData = rows.map(
        (row) => Array.from(row.querySelectorAll('td[data-block-type="table-cell"]')).map(
          (cell) => cellConverter.turndown(cell.innerHTML).trim().replace(/\|/g, "\\|").replace(/\n/g, "<br>")
        )
      );
      const maxCols = Math.max(...tableData.map((row) => row.length));
      let markdown = "\n";
      markdown += `| ${tableData[0].map((cell) => cell || " ").join(" | ")} |
`;
      markdown += `| ${Array(maxCols).fill("---").join(" | ")} |
`;
      for (let index = 1; index < tableData.length; index += 1) {
        markdown += `| ${tableData[index].map((cell) => cell || " ").join(" | ")} |
`;
      }
      return `${markdown}
`;
    }
  });
  service.addRule("bulbOrderedList", {
    filter: (node) => node.nodeName === "OL" && node.getAttribute("data-block-type") === "list-item",
    replacement: (_content, node) => {
      const element = node;
      const placeholder = element.querySelector(".item-list-placeholder");
      const leftValue = Number.parseInt(placeholder?.style.left || "0", 10);
      const indent = leftValue >= 56 ? "        " : leftValue >= 28 ? "    " : "";
      const number = (placeholder?.textContent?.trim() || "1.").replace(".", "");
      const textContent = element.querySelector("li")?.textContent?.trim() || "";
      return `${indent}${number}.  ${textContent}
`;
    }
  });
  service.addRule("bulbUnorderedList", {
    filter: (node) => node.nodeName === "UL" && node.getAttribute("data-block-type") === "list-item",
    replacement: (_content, node) => {
      const element = node;
      const placeholder = element.querySelector(".item-list-placeholder");
      const leftValue = Number.parseInt(placeholder?.style.left || "0", 10);
      const indent = leftValue >= 56 ? "        " : leftValue >= 28 ? "    " : "";
      const textContent = element.querySelector("li")?.textContent?.trim() || "";
      return `${indent}-   ${textContent}
`;
    }
  });
  service.addRule("bulbCodeBlock", {
    filter: (node) => node.nodeName === "DIV" && node.getAttribute("data-block-type") === "code",
    replacement: (_content, node) => {
      const element = node;
      const language = element.querySelector(".code-language-change-btn > span")?.textContent?.trim() || "";
      const codeText = Array.from(element.querySelectorAll('pre[data-block-type="code-line"]')).map((line) => line.querySelector("code")?.textContent || "").join("\n");
      if (!codeText) {
        return "";
      }
      return language ? `
\`\`\`${language}
${codeText}
\`\`\`
` : `
\`\`\`
${codeText}
\`\`\`
`;
    }
  });
  service.addRule("removePlaceholder", {
    filter: (node) => {
      if (node.nodeName !== "DIV") return false;
      const className = node.getAttribute("class") || "";
      return className.includes("item-list-placeholder") || className.includes("heading-fold-button");
    },
    replacement: () => ""
  });
  service.addRule("removeDecorations", {
    filter: (node) => {
      if (!["DIV", "SPAN"].includes(node.nodeName)) return false;
      const className = node.getAttribute("class") || "";
      return className.includes("bulb-") && !className.includes("bulb-editor") && !className.includes("bulb-heading");
    },
    replacement: (content) => content
  });
}
function convertPopoHtmlToMarkdown(documentHtml) {
  const images = [];
  const service = createBaseTurndownService();
  if (documentHtml.source === "markdown") {
    registerMarkdownRules(service, images);
  } else {
    registerRichTextRules(service, images);
  }
  return {
    markdown: normalizeMarkdownOutput(service.turndown(documentHtml.html)),
    images
  };
}
function normalizeMarkdownOutput(markdown) {
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

// src/lib/image-assets.ts
function escapeMarkdownText(value) {
  return value.replace(/[\[\]\\]/g, "\\$&");
}
function sanitizeFileSegment(value) {
  return value.normalize("NFKD").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}
function toHex(buffer) {
  return Array.from(new Uint8Array(buffer)).map((value) => value.toString(16).padStart(2, "0")).join("");
}
async function sha256(value) {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(hashBuffer);
}
function inferExtension(asset) {
  const title = asset.title?.trim().toLowerCase() || "";
  if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(title)) {
    return title.split(".").pop() || "png";
  }
  try {
    const url = new URL(asset.src);
    const fileName = url.pathname.split("/").pop() || "";
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (extension && ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension)) {
      return extension;
    }
  } catch {
    return "png";
  }
  return "png";
}
function joinMarkdownPath(fileName) {
  return fileName;
}
function buildMarkdownLink(path, alt, title) {
  const safeAlt = escapeMarkdownText(alt || "\u56FE\u50CF");
  return title ? `![${safeAlt}](${path} "${title.replace(/"/g, "&quot;")}")` : `![${safeAlt}](${path})`;
}
async function createFileName(documentHtml, asset, index) {
  const titleBase = sanitizeFileSegment(documentHtml.title) || "popo-doc";
  const hash = (await sha256(`${documentHtml.title}|${asset.src}|${index}`)).slice(0, 12);
  const extension = inferExtension(asset);
  return `${titleBase}-${hash}.${extension}`;
}
async function buildPendingImageExports(documentHtml, images, _settings) {
  return Promise.all(
    images.map(async (asset, index) => {
      const fileName = await createFileName(documentHtml, asset, index);
      const markdownPath = joinMarkdownPath(fileName);
      return {
        placeholder: asset.placeholder,
        src: asset.src,
        alt: asset.alt,
        title: asset.title,
        fileName,
        markdownLink: buildMarkdownLink(markdownPath, asset.alt, asset.title),
        fallbackMarkdown: buildMarkdownLink(asset.src, asset.alt, asset.title)
      };
    })
  );
}
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 32768;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
async function fetchImageWriteRequests(pending) {
  return Promise.all(
    pending.map(async (item) => {
      const response = await fetch(item.src, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`\u56FE\u7247\u4E0B\u8F7D\u5931\u8D25: ${response.status}`);
      }
      return {
        placeholder: item.placeholder,
        fileName: item.fileName,
        base64Data: arrayBufferToBase64(await response.arrayBuffer())
      };
    })
  );
}
function applyImageWriteResults(markdown, pending, writeResults) {
  const resultByPlaceholder = /* @__PURE__ */ new Map();
  for (const result of writeResults) {
    resultByPlaceholder.set(result.placeholder, result);
  }
  let nextMarkdown = markdown;
  let failedCount = 0;
  for (const item of pending) {
    const writeResult = resultByPlaceholder.get(item.placeholder);
    if (writeResult?.ok && writeResult.markdownLink) {
      nextMarkdown = nextMarkdown.replace(item.placeholder, writeResult.markdownLink);
      continue;
    }
    failedCount += 1;
    nextMarkdown = nextMarkdown.replace(item.placeholder, item.fallbackMarkdown);
  }
  return { markdown: nextMarkdown, failedCount };
}

// src/lib/settings.ts
var STORAGE_KEY = "exportSettings";
var DEFAULT_SETTINGS = {
  configured: false
};
async function getExportSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  const settings = stored[STORAGE_KEY];
  return settings ? { ...DEFAULT_SETTINGS, ...settings } : { ...DEFAULT_SETTINGS };
}

// src/lib/toast.ts
var TOAST_ID = "__popo_doc_to_markdown_toast__";
var TOAST_TEXT_ID = "__popo_doc_to_markdown_toast_text__";
var TOAST_SPINNER_ID = "__popo_doc_to_markdown_toast_spinner__";
var TOAST_STYLE_ID = "__popo_doc_to_markdown_toast_style__";
var hideTimer;
function ensureToastStyles() {
  if (document.getElementById(TOAST_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = TOAST_STYLE_ID;
  style.textContent = `
    @keyframes popo-doc-to-markdown-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.documentElement.appendChild(style);
}
function ensureToastContainer() {
  const existing = document.getElementById(TOAST_ID);
  if (existing instanceof HTMLDivElement) {
    return existing;
  }
  ensureToastStyles();
  const toast = document.createElement("div");
  toast.id = TOAST_ID;
  toast.style.position = "fixed";
  toast.style.top = "24px";
  toast.style.right = "24px";
  toast.style.zIndex = "2147483647";
  toast.style.maxWidth = "360px";
  toast.style.padding = "12px 16px";
  toast.style.borderRadius = "10px";
  toast.style.fontSize = "14px";
  toast.style.lineHeight = "1.5";
  toast.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  toast.style.boxShadow = "0 10px 30px rgba(0, 0, 0, 0.18)";
  toast.style.color = "#ffffff";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(-6px)";
  toast.style.transition = "opacity 120ms ease, transform 120ms ease";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  const spinner = document.createElement("div");
  spinner.id = TOAST_SPINNER_ID;
  spinner.style.display = "none";
  spinner.style.width = "14px";
  spinner.style.height = "14px";
  spinner.style.borderRadius = "999px";
  spinner.style.border = "2px solid rgba(255, 255, 255, 0.35)";
  spinner.style.borderTopColor = "#ffffff";
  spinner.style.animation = "popo-doc-to-markdown-spin 0.8s linear infinite";
  spinner.style.flex = "0 0 auto";
  const text = document.createElement("div");
  text.id = TOAST_TEXT_ID;
  text.style.minWidth = "0";
  toast.appendChild(spinner);
  toast.appendChild(text);
  document.documentElement.appendChild(toast);
  return toast;
}
function showToast(message, variant) {
  const toast = ensureToastContainer();
  const text = document.getElementById(TOAST_TEXT_ID);
  const spinner = document.getElementById(TOAST_SPINNER_ID);
  if (text instanceof HTMLDivElement) {
    text.textContent = message;
  }
  if (spinner instanceof HTMLDivElement) {
    spinner.style.display = variant === "loading" ? "block" : "none";
  }
  toast.style.background = variant === "success" ? "rgba(22, 163, 74, 0.96)" : variant === "error" ? "rgba(220, 38, 38, 0.96)" : "rgba(37, 99, 235, 0.96)";
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  if (hideTimer) {
    window.clearTimeout(hideTimer);
    hideTimer = void 0;
  }
  if (variant === "loading") {
    return;
  }
  hideTimer = window.setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    hideTimer = void 0;
  }, 2200);
}

// src/lib/clipboard.ts
async function copyWithNavigatorClipboard(markdown) {
  await navigator.clipboard.writeText(markdown);
}
function copyWithExecCommand(markdown) {
  const textarea = document.createElement("textarea");
  textarea.value = markdown;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  const selection = document.getSelection();
  const originalRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);
  if (activeElement) {
    activeElement.focus();
  }
  if (selection) {
    selection.removeAllRanges();
    if (originalRange) {
      selection.addRange(originalRange);
    }
  }
  if (!copied) {
    throw new Error("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u91CD\u65B0\u805A\u7126\u9875\u9762\u540E\u518D\u8BD5");
  }
}
async function writeMarkdownToClipboard(markdown) {
  try {
    await copyWithNavigatorClipboard(markdown);
  } catch (error) {
    if (error instanceof Error && error.message.includes("Document is not focused")) {
      copyWithExecCommand(markdown);
      return;
    }
    throw error;
  }
}

// src/content-script.ts
var COPY_MESSAGE_TYPE = "POPO_COPY_MARKDOWN";
var WRITE_IMAGES_MESSAGE_TYPE = "POPO_WRITE_IMAGES";
var OPEN_OPTIONS_MESSAGE_TYPE = "POPO_OPEN_OPTIONS";
function shouldHandleCopyRequest() {
  if (!window.location.hostname.includes("office.netease.com")) {
    return false;
  }
  if (window.location.pathname.startsWith("/doc-editor")) {
    return false;
  }
  return Boolean(document.querySelector("#doc-iframe"));
}
function sendRuntimeMessage(message) {
  return chrome.runtime.sendMessage(message);
}
async function ensureImageExportReady() {
  const settings = await getExportSettings();
  if (settings.configured) {
    return;
  }
  await sendRuntimeMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE, reason: "NO_DIRECTORY" });
  throw new Error("\u8BF7\u5148\u5728\u6269\u5C55\u8BBE\u7F6E\u4E2D\u9009\u62E9\u56FE\u7247\u5BFC\u51FA\u76EE\u5F55");
}
async function exportMarkdownImages(markdown, documentHtml) {
  const converted = convertPopoHtmlToMarkdown(documentHtml);
  if (converted.images.length === 0) {
    return { markdown, failedCount: 0 };
  }
  await ensureImageExportReady();
  const settings = await getExportSettings();
  const pending = await buildPendingImageExports(documentHtml, converted.images, settings);
  const requests = await fetchImageWriteRequests(pending);
  const response = await sendRuntimeMessage({
    type: WRITE_IMAGES_MESSAGE_TYPE,
    requests,
    pending
  });
  if (!response.ok || !response.results) {
    if (response.message === "DIRECTORY_PERMISSION_REQUIRED") {
      await sendRuntimeMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE, reason: "PERMISSION_DENIED" });
      throw new Error("\u56FE\u7247\u76EE\u5F55\u6743\u9650\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u76EE\u5F55");
    }
    throw new Error(response.message || "\u56FE\u7247\u5199\u5165\u5931\u8D25");
  }
  return applyImageWriteResults(markdown, pending, response.results);
}
async function copyMarkdown() {
  const eligibility = checkPopoPageEligibility();
  if (!eligibility.ok) {
    return {
      ok: false,
      message: eligibility.reason || "\u5F53\u524D\u9875\u9762\u4E0D\u652F\u6301\u590D\u5236"
    };
  }
  showToast("\u6B63\u5728\u5BFC\u51FA\u56FE\u7247\u5E76\u590D\u5236 Markdown\uFF0C\u8BF7\u7A0D\u5019\u2026", "loading");
  const documentHtml = extractPopoDocumentHtml();
  const converted = convertPopoHtmlToMarkdown(documentHtml);
  if (!converted.markdown.trim()) {
    return {
      ok: false,
      message: "\u6B63\u6587\u63D0\u53D6\u6210\u529F\uFF0C\u4F46 Markdown \u4E3A\u7A7A"
    };
  }
  const exported = await exportMarkdownImages(converted.markdown, documentHtml);
  const titlePrefix = documentHtml.title ? `# ${documentHtml.title}

` : "";
  const finalMarkdown = `${titlePrefix}${normalizeMarkdownOutput(exported.markdown)}`.trim();
  await writeMarkdownToClipboard(finalMarkdown);
  return {
    ok: true,
    message: exported.failedCount > 0 ? `\u5DF2\u590D\u5236\u6210\u529F\uFF0C\u4F46\u6709 ${exported.failedCount} \u5F20\u56FE\u7247\u4ECD\u4FDD\u7559\u8FDC\u7A0B\u94FE\u63A5` : "\u5DF2\u590D\u5236\u6210\u529F",
    markdown: finalMarkdown
  };
}
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== COPY_MESSAGE_TYPE) {
    return false;
  }
  if (!shouldHandleCopyRequest()) {
    return false;
  }
  void copyMarkdown().then((result) => {
    showToast(result.message, result.ok ? "success" : "error");
    sendResponse(result);
  }).catch(async (error) => {
    const messageText = error instanceof Error ? error.message : "\u590D\u5236\u5931\u8D25";
    if (messageText.includes("\u56FE\u7247\u5BFC\u51FA\u76EE\u5F55") || messageText.includes("\u6743\u9650\u5931\u6548")) {
      await sendRuntimeMessage({ type: OPEN_OPTIONS_MESSAGE_TYPE });
    }
    showToast(messageText, "error");
    sendResponse({
      ok: false,
      message: messageText
    });
  });
  return true;
});
