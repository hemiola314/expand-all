let todo = 6;

const EXPAND_POST = 1; // not used anymore
const EXPAND_COMMENTS = 2;
const EXPAND_REPLIES = 4;
const EXPAND_XLAT = 8; // not used anymore
const EXPAND_FILTER = 16;

const WAIT_TIME = 100; // in ms
const MAX_WAIT = 20; // in iterations
const END_DELAY = 3.0; // in seconds

const POST_ARTICLE = "[class=\"x1a2a7pz\"][role=\"article\"]";
const FS_ARTICLE = "[role=\"complementary\"]";
const ANY_ARTICLE = POST_ARTICLE + "," + FS_ARTICLE;

const VIDEO_FEED = "#watch_feed";

// https://www.facebook.com/groups/CompuserveSYSOPs/posts/10157858262066056
const ROLE_MAIN = "[role=\"main\"]";

// 1: https://www.facebook.com/jens.farley
//    innermost button: "What's on your mind?"
// 2: https://www.facebook.com/MandarinCompanion/
//    first DIV that covers profile pic and "Create post" button
const POST_ACTION = ".xt7dq6l[role=\"button\"],.xu9j1y6";

const RESPONSE_COUNTER = "[aria-label][role=\"article\"]";

const GET_CONTENT = ".xsyo7zv[role=\"button\"]";
// :not(li) applied programmatically
const GET_COMMENTS = ".x13a6bvl " + GET_CONTENT;

const FILTER = ".xe0p6wg > [role=\"button\"]";
const FILTER_MENU = "[role=\"menu\"]";
const FILTER_ITEM = "[role=\"menuitem\"]";
const FILTER_ITEM_INNER = "span";

const CSS_LOGIN_STUFF = "._5hn6,[data-nosnippet]";

const SM_COMMENT = "[dir=\"auto\"] [role=\"button\"]";
const SEE_MORE_COMMENT = RESPONSE_COUNTER + " " + SM_COMMENT;

const SM_BASE = "div.x1s688f.xt0b8zv";
const SEE_MORE_BASE = POST_ARTICLE + " " + SM_BASE + "," + FS_ARTICLE + " " + SM_BASE;

const _NONE = "no-value";
const _COMMENTS = "-comments";
const _REPLIES = "-replies";

const SETTINGS_KEY = "expand-all-todo";

function bind(obj, fn) {
    return function() { fn.apply(obj, arguments); };
}

let Global = null;

// forEach polyfill
if (!document.querySelectorAll("xx").forEach) {
    Object.prototype.forEach = function(callback) {
        let T;
        if (arguments.length > 1) {
            T = arguments[1];
        }

        let O = Object(this);
        let len = O.length >>> 0;

        let k = 0;
        while (k < len) {
            if (k in O) {
                callback.call(T, O[k], k, O);
            }

            k++;
        }
    };
}

///////////////////////////////////////////////////////////////////////////////
// EscHandler

class EscHandler {
    constructor() {
        this.abortNow = false;
        this.handler = bind(this, this.docKeyDown);
    }

    shouldAbort() {
        return this.abortNow;
     }

    abort(value) {
        if (value && !this.shouldAbort() && !Global.cfg) {
            Global.log("Aborting...");
        }

        this.abortNow = value;
    }

    on() {
        this.abortNow = false;
        document.addEventListener("keydown", this.handler);
    }

    off() {
        this.abortNow = true;
        document.removeEventListener("keydown", this.handler);
    }

    docKeyDown(e) {
        if (e.keyCode == 27) {
            e.preventDefault();
            this.abort(true);
            if (Global.cfg) {
                Session.trulyEnd();
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////////
// CfgHandler

class CfgHandler {
    constructor() {
        this.doConfig = false;
        this.handler = bind(this, this.docKeyDown);
    }

    shouldConfig() {
        return this.doConfig;
    }

    on() {
        this.doConfig = false;
        document.addEventListener("keydown", this.handler);
    }

    off() {
        this.doConfig = true;
        document.removeEventListener("keydown", this.handler);
    }

    docKeyDown(e) {
        if (e.keyCode === "S".charCodeAt(0)) {
            e.preventDefault();
            if (e.ctrlKey) {
                Settings.removeKey(SETTINGS_KEY);
                Global.log("Will use default settings");
                return;
            }

            this.doConfig = true;
            if (Global.ending) {
                CfgWindow.showIt();
            }
        }
    }
}

///////////////////////////////////////////////////////////////////////////
// Settings

class Settings {
    static hasValue(value) {
       return window.localStorage.getItem(value) !== null;
    }

    static getValue(value, deflt) {
       if (arguments.length < 2) {
           deflt = null;
       }

       if (!Settings.hasValue(value)) {
           return deflt;
       }

       return window.localStorage.getItem(value);
    }

    static getInt(value, deflt) {
       if (arguments.length < 2) {
           deflt = -1;
       }

       return Number.parseInt(Settings.getValue(value, deflt), 10);
    }

    static getBoolean(value, deflt) {
       if (arguments.length < 2) {
           deflt = "false";
       }

       return Settings.getValue(value, "" + deflt) == "true";
    }

    static setValue(key, value) {
       return window.localStorage.setItem(key, "" + value);
    }

    static removeKey(key) {
       return window.localStorage.removeItem(key);
    }
}

///////////////////////////////////////////////////////////////////////////////
// BaseWindow

class BaseWindow {
    constructor() {
        this.id = "base-window";
    }

    show() {
        const WANT_W = 300;
        const WANT_H = 200;

        const sizer = document.querySelector("html");
        const w = sizer.clientWidth;
        const h = sizer.clientHeight;

        let x = 0;
        if (w > WANT_W) {
            x = (w - WANT_W) / 2;
        }

        let y = 0;
        if (h > WANT_H) {
            y = (h - WANT_H) / 3;
        }

        let div = document.createElement("div");
        div.id = this.id;
        div.style.direction = "ltr";
        div.style.position = "fixed";
        div.style.zIndex = "999999";
        div.style.left = x + "px";
        div.style.width = WANT_W + "px";
        div.style.top = y + "px";
        div.style.height = WANT_H + "px";
        div.style.color = "#fff";
        div.style.backgroundColor = "#425f9c";

        document.body.insertAdjacentElement("afterbegin", div);

        this.create(div);
        this.init(div);
    }

    create(div) { }
    init(div) { }

    hide() {
        document.querySelectorAll("#" + this.id).forEach(item => document.body.removeChild(item));
    }
}

///////////////////////////////////////////////////////////////////////////////
// CfgWindow

class CfgWindow extends BaseWindow {
    constructor() {
        super();
        this.id = "cfg-window";
    }

    create(div) {
        let node = document.createElement("p");
        div.appendChild(node);
        node.innerHTML = "<i>Expand All</i> Settings";
        node.style.marginLeft = "4px";
        node.style.fontWeight = "bold";

        const boxes = [
            ["Expand comments.", EXPAND_COMMENTS],
            ["Expand replies.", EXPAND_REPLIES],
            ["Don&apos;t force <i>All comments</i> filter.", EXPAND_FILTER]
        ];

        boxes.forEach(item => {
            node = document.createElement("p");
            div.appendChild(node);
            node.style.marginTop = "2px";
            node.style.marginBottom = "2px";

            let node2 = document.createElement("input");
            node.appendChild(node2);
            node2.type = "checkbox";
            node2.value = item[1];
            node2.style.marginLeft = "15px";
            node2.style.cursor = "pointer";

            node2 = document.createElement("label");
            node.appendChild(node2);
            node2.innerHTML = item[0];
            node2.style.cursor = "pointer";
            node2.style.paddingBottom = "5px";
            node2.style.fontWeight = "normal";
            node2.style.color = "#fff";
        });

        node = document.createElement("div");
        div.appendChild(node);
        node.style.textAlign = "center";

        let node2 = document.createElement("button");
        node.appendChild(node2);
        node2.innerHTML = "Done";
        node2.style.cursor = "pointer";
        node2.addEventListener("click", Session.trulyEnd);

        div.addEventListener("CheckboxStateChange", CfgWindow.check);
        div.addEventListener("click", CfgWindow.check);
    }

    static check(e) {
        let node = Dom.upThenDown(e.target, "p", "input");
        if (!!node && node != e.target) {
            node.checked = !node.checked;

            if (node.checked) {
                todo |= Number.parseInt(node.value);
            } else {
                todo &= ~Number.parseInt(node.value);
            }

            Settings.setValue(SETTINGS_KEY, todo);
        }
    }

    init(div) {
        let boxes = div.querySelectorAll("input");
        if (boxes.length === 3) {
            boxes[0].checked = (todo & EXPAND_COMMENTS) != 0;
            boxes[1].checked = (todo & EXPAND_REPLIES) != 0;
            boxes[2].checked = (todo & EXPAND_FILTER) != 0;
        }
    }

    static showIt() {
        Global.logger.hide();
        Global.cfg = new CfgWindow();
        Global.cfg.show();
    }
}

///////////////////////////////////////////////////////////////////////////////
// LogWindow

class LogWindow extends BaseWindow {
    constructor() {
        super();
        this.id = "log-window";
        this.timeouts = 0;
        this.phantoms = 0;
        this.edit = null;
     }

    create(div) {
        this.edit = document.createElement("textarea");
        this.edit.style.width = "100%";
        this.edit.style.height = "100%";
        this.edit.style.color = "#fff";
        this.edit.style.backgroundColor = "#425f9c";

        div.appendChild(this.edit);
    }

    hide() {
        BaseWindow.prototype.hide.call(this);
        this.edit = null;
    }

    log(s) {
        console.log(s);
        if (this.edit) {
            this.edit.value = s + "\n" + this.edit.value;
        }
    }

    timeout() {
        this.timeouts++;
    }

    phantom() {
        this.phantoms++;
    }

    counts() {
        if (this.timeouts > 0) {
            this.log(this.timeouts + " timeout(s)");
        }

        if (this.phantoms > 0) {
//          this.log(this.phantoms + " phantom(s)");
        }

        this.log("Responses showing = " + Global.root.queryAll(RESPONSE_COUNTER).length);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Root

class Root {
    constructor() {
        this.rootNode = document.body;
        this.usingBody = true;
    }

    static removeOverlay() {
        document.querySelectorAll(CSS_LOGIN_STUFF).forEach(item => {
            Global.log("Removing overlay stuff");
            item.parentNode.removeChild(item);
        });
    }

    query(s) {
        return this.rootNode.querySelector(s);
    }

    queryAll(s) {
        return this.rootNode.querySelectorAll(s);
    }

    determine() {
        if (Dom.filterHidden(document.querySelectorAll(VIDEO_FEED)).length === 1) {
            Global.log("Video feed; please drill down to one video (click the time stamp).");
            return false;
        }

        const EXPANDING = "Expanding: ";

        const divv = Dom.findFirstVisible(document.querySelectorAll(POST_ARTICLE));
        if (!!divv) {
            let canPost = !!document.querySelector(POST_ACTION);;
            let topOnly = !canPost;

            if (topOnly) {
                // PinkNews has no post ability; want topmost
                topOnly = Dom.roles("contentinfo") == 0;
            } else {
                // https://www.facebook.com/groups/163266214168433/?multi_permalinks=510108426150875
                // https://www.facebook.com/CyprusMail/ (pinned post)
                topOnly = Dom.roles("feed") == 2 && Dom.roles("grid") == 1 && Dom.roles("contentinfo") == 0;
            }

            if (topOnly) {
                Global.log(EXPANDING + "Topmost post");
                this.rootNode = divv.parentNode;
                this.usingBody = false;
            }
        }

        if (!this.usingBody) {
            return true;
        }

        const USE_PARENT = true;

        let check = [];
        check.push([FS_ARTICLE, "Full browser", !USE_PARENT]);
        check.push([ROLE_MAIN, "Main content area", !USE_PARENT]);

        check.find(item => {
            const divs = Dom.filterHidden(document.querySelectorAll(item[0]));
            let div = null;
            if (divs.length > 0) {
                // probably insane
                div = divs[0];
            }

            if (!!div) {
                Global.log(EXPANDING + item[1]);
                if (item[2] == USE_PARENT) {
                    div = div.parentNode;
                }

                this.rootNode = div;
                this.usingBody = false;
                return true;
            }
        });

        return true;
    }

    getRoot() {
        return this.rootNode;
    }

    getResponseCount() {
        return getResponseCount(this.rootNode);
    }

    getContentSize() {
        let result = this.rootNode.scrollHeight;
        result += this.getResponseCount();
        return result;
    }

    countPosts() {
        let result = this.rootNode.parentNode.querySelectorAll(ANY_ARTICLE).length;
        if (result == 0 && this.rootNode.parentNode.querySelectorAll(ROLE_MAIN).length > 0) {
            result = 1;
        }

        return result;
    }
}

///////////////////////////////////////////////////////////////////////////////
// Dom

class Dom {
    static getStyle(node) {
        return node.ownerDocument.defaultView.getComputedStyle(node, null);
    }

    static isHidden(node) {
        while (node && node.ownerDocument) {
            if (Dom.getStyle(node)["display"] == "none") {
                return true;
            }

            if (Dom.getStyle(node)["visibility"] == "hidden") {
                return true;
            }

            node = node.parentNode;
        }

        return false;
    }

    static filterHidden(nodes) {
        let result = [];
        if (nodes) {
            nodes.forEach(item => {
                if (!Dom.isHidden(item)) {
                    result.push(item);
                }
            });
        }

        return result;
    }

    static roles(role) {
        return Dom.filterHidden(document.querySelectorAll("[role=\"" + role + "\"]")).length;
    }

    static findFirstVisible(nodes) {
        if (!nodes) {
            return null;
        }

        let filtered = Dom.filterHidden(nodes);
        return filtered.length >= 1 ? filtered[0] : null;
    }

    static dumpAncestors(node) {
        while (node) {
            let s = node.nodeName;
            if (node.id) {
                s += " id=\"" + node.id + "\"";
            }

            if (node.className) {
                s += " class=\"" + node.className + "\"";
            }

            if (Dom.isHidden(node)) {
                s += " hidden";
            }

            if (node.role) {
                s += " role=\"" + node.role + "\"";
            }

            Global.log(s);
            node = node.parentNode;
        }
    }

    static upThenDown(node, ancestor, descendant) {
        const item = node.parentNode.closest(ancestor);
        if (item) {
            return item.querySelector(descendant);
        }

        return null;
    }

    static childIndex(node) {
        return [Array.from(node.parentNode.children).indexOf(node), node.parentNode.childElementCount];
    }

    static hasTextView(s) {
        const words = [
            /^View%20/,  // English (en_US and en_GB)
            /^檢視另/, // Traditional Chinese (zh_TW, zh_HK)
            /^另%20/,     // Simplified Chinese (zh_CN)
            /^其他/,    // Simplified Chinese (zh_CN)
            /^आणखी%20/,  // Marathi (mr_IN)
            /%20देखें$/,    // Hindi (hi_IN)
            /%20চাওক$/,  // Assamese (as_IN)
            /%20দেখুন$/,  // Bengali (bn_IN)
            /%20ਵੇਖੋ$/,    // Panjabi (pa_IN)
            /%20જુઓ$/,   // Gujarati (gu_IN)
            /%20ଦେଖନ୍ତୁ$/,  // Oriya (or_IN)
            /%20காட்டு$/, // Tamil (ta_IN)
            /%20వీక్షించండి$/, // Telugu (te_IN)
            /%20ವೀಕ್ಷಿಸಿ$/,    // Kannada (ka_IN)
            /%20കാണുക$/, // Malayalam (ml_IN)
            /^Ver%20/,     // Spanish and Portuguese (es_LA, es_ES, pt_BR, pt_PT)
            /^Afficher%20/, // French (fr_CA, fr_FR)
            /^عرض%20/,     // Arabic (ar_AR)
            /^Показать%20/, // Russian (ru_RU)
            /^Lihat%20/,      // Indonesian (in_ID)
            /^Tampilkan%20/,  // Indonesian (in_ID)
            /件を表示$/,        // Japanese (ja_JA, ja_KS)
            /件を見る$/,        // Japanese
            /^Преглед%20/,     // Bulgarian (bg_BG)
            /%20보기$/,         // Korean (ko_KR)
            /^Visualizza%20/,  // Italian (it_IT)
            /%20ansehen$/,     // German (de_DE)
            /^Zobrazit%20/,    // Czech (cs_CZ)
            /^Vis%20/,         // Danish and Norwegian/bokmål (da_DK, nb_NO)
            /^Sjå%20/,         // Norwegian/nynorsk (nn_NO)
            /^Visa%20/,       // Swedish (sv_SE)
            /^Näytä%20/,      // Finnish (fi_FI)
            /^Skoða%20/,      // Icelandic (is_IS)
            /%20weergeven$/,  // Dutch (nl_NL)
            /%20bekijken$/,   // Dutch (nl_BE)
            /^Bekijk%20/,     // Dutch (nl_BE)
            /^Δείτε%20/       // Greek
        ];

        return words.some(re => { return s.match(re) != null; });
    }

    static isTextAllComments(s) {
        const phrases = [
            "All comments".toLowerCase(), // English
            "Semua komentar".toLowerCase(), // Indonesian
            "Todos os comentários".toLowerCase(), // Portuguese
            "Všechny komentáře".toLowerCase(), // Czech
            "Все комментарии".toLowerCase(), // Russian
            "Όλα τα σχόλια".toLowerCase(), // Greek
            "すべてのコメント", // Japanese
            "Tutti i commenti".toLowerCase() // Italian
        ];

        return phrases.indexOf(s.trim().toLowerCase()) >= 0;
    }
}

///////////////////////////////////////////////////////////////////////////////
// general

function getResponseCount(item) {
    return item.querySelectorAll(RESPONSE_COUNTER).length;
}

function ensureCommentsShowing(onDone) {
    let n = Global.root.countPosts();
    if (n > 1) {
        Global.log("Found " + n + " posts");
    }

    // @todo
    // https://www.facebook.com/photo?fbid=1124898877855180
    // https://www.facebook.com/125982670754724/videos/372875816621699/
    let filter = [];
/*
    Global.root.queryAll(ANY_ARTICLE).forEach(item => {
        if (item has hidden comments) {
            const link = link to show comments;
            if (link) {
                filter.push(link);
            }
        }
    });
*/
    if (filter.length > 0) {
        Global.log("Showing comment area for " + filter.length + " post(s)");
        clickAndWait(_NONE, onDone, filter, 0);
    } else {
        if (onDone) onDone();
    }
}

function clickClass(value, onDone) {
    if (Global.escHandler.shouldAbort()) {
        if (onDone) onDone();
        return;
    }

    let filter = Array.from(Global.root.queryAll(value)).filter(item => {
        if (value === SEE_MORE_BASE) {
            if (item.closest(RESPONSE_COUNTER)) {
                return false;
            }
        }

        if (value === SEE_MORE_COMMENT || value === SEE_MORE_BASE) {
            // must have no child nodes
            if (!!item.childElementCount) {
                return false;
            }
        }

        if (value === SEE_MORE_BASE) {
            // must be preceded by ellipsis; otherwise See Less, See original, etc.

            // the old way of doing things
            // https://www.facebook.com/sbsnews/videos/372875816621699/
            if (item.parentNode.parentNode.previousSibling) {
                let full = item.parentNode.parentNode.previousSibling.textContent;
                if (full.charCodeAt(full.length - 1) === 8230) {
                    return true;
                }
            }

            // a new way of doing things
            // https://www.facebook.com/newspaperscom/
            if (item.previousSibling && item.previousSibling.previousSibling) {
                let full = item.previousSibling.previousSibling.textContent;
                if (full.charCodeAt(full.length - 1) === 8230) {
                    return true;
                }
            }

            // a new way of doing things
            // https://www.facebook.com/ManresaRestaurant/
            if (item.previousSibling && item.previousSibling.previousSibling && item.previousSibling.previousSibling.previousSibling) {
                let full = item.previousSibling.previousSibling.previousSibling.textContent;
                if (full.charCodeAt(full.length - 1) === 8230) {
                    return true;
                }
            }

            return false;
        }

        return true;
    });

    if (filter.length > 0) {
        clickAndWait(value, onDone, filter, 0);
    } else {
        if (onDone) onDone();
    }

    return filter.length;
}

function doNotWait(value) {
    return [ SEE_MORE_COMMENT,
             SEE_MORE_BASE
           ].indexOf(value) >= 0;
}

function getCommentsOrReplies(comments, onDone) {
    if (Global.escHandler.shouldAbort()) {
        if (onDone) onDone();
        return;
    }

    let filter = Array.from(Global.root.queryAll(GET_CONTENT));
    if (filter.length > 0) {
        if (comments) {
            filter = Array.from(Global.root.queryAll(GET_COMMENTS));
            // https://www.facebook.com/groups/AnalfabetiDellaBirra/permalink/2080384488695788/
            filter = filter.filter(item => !item.parentNode.closest("li"));
       } else {
            // avoid collapse / hide toggle
            filter = filter.filter(function(item) {
                // if nested, keep it (it's not Hide)
                if (!!item.closest("ul") && !!item.closest("ul").parentNode.closest("ul")) {
                    // https://www.facebook.com/groups/297274457043228/posts/2696675147103135/
                    return true;
                }

                // if link is first child, and has siblings, it's Hide position
                let x = Dom.childIndex(item.parentNode);
                let skip = x[0] == 0 && x[1] != 1;

                // this one's different:
                // https://www.facebook.com/MarjorieTaylorGreene/posts/2547514125538682
                if (!skip) {
                    skip = x[0] == 2 && x[1] == 3;
                }

                // override?
                if (skip) {
                    skip = !Dom.hasTextView(item.textContent);
                }

                return !skip;
            });
        }
  }

    if (filter.length > 0) {
        clickAndWait(comments ? _COMMENTS : _REPLIES, onDone, filter, 0);
    } else {
        if (onDone) onDone();
    }
}

function getBestLabel(link) {
    let label = link.getAttribute("aria-label");

    if (!label) {
        label = link.textContent;
    }

    // chop off some extra stuff if present
    label = label.split("\u00a0\u0020\u00b7")[0];
    label = label.split("\u0020\u00b7")[0];

    return label;
}

function clickAndWait(value, onDone, links, i) {
    if (Global.escHandler.shouldAbort()) {
        if (onDone) onDone();
        return;
    }

    // do this before clicking
    let n = Global.root.getContentSize();

    Global.log("click (" + (links.length - i - 1) + " left): " + getBestLabel(links[i]));
    links[i].click();

    if (value == _NONE) {
        n = Global.root.getContentSize();
    }

    let wait = MAX_WAIT;
    let time = WAIT_TIME;
    if (doNotWait(value)) {
        wait = -1;
        time = 0;
    }

    window.setTimeout(() => waitHelper(value, onDone, links, i, n, wait), time);
}

function waitHelper(value, onDone, links, i, n, wait) {
    if (wait === -1) {
        if (++i < links.length) {
            clickAndWait(value, onDone, links, i);
        } else {
            if (onDone) onDone();
        }

        return;
    }

    if (Global.root.getContentSize() - n != 0) {
        if (++i < links.length) {
            clickAndWait(value, onDone, links, i);
        } else {
            // new content may contain more of what we were asked to look for
            if (value == _COMMENTS || value == _REPLIES) {
                getCommentsOrReplies(value == _COMMENTS, onDone);
            } else {
                if (onDone) onDone();
            }
        }

        return;
    }

    if (window.doPhantomCheck && !Global.root.getRoot().contains(links[i])) {
        Global.logger.phantom();
        wait = -1;
    }

    // avoid looping forever
    if (wait > 0) {
        window.setTimeout(() => waitHelper(value, onDone, links, i, n, --wait), WAIT_TIME);
        return;
    }

    if (wait == 0) {
        Global.logger.timeout();
    }

    if (++i < links.length) {
        clickAndWait(value, onDone, links, i);
    } else {
        if (onDone) onDone();
    }
}

///////////////////////////////////////////////////////////////////////////////
// pumping (iteratively getting comments and replies)

function pumpOnce(onDone) {
    window.responseCount = Global.root.getResponseCount();
    window.doPhantomCheck = true;
    if ((todo & EXPAND_COMMENTS) != 0) {
        getCommentsOrReplies(true, () => pumpOnce2(onDone));
    } else {
        pumpOnce2(onDone);
    }
}

function pumpOnce2(onDone) {
    if ((todo & EXPAND_REPLIES) != 0) {
        getCommentsOrReplies(false, () => pumpOnce3(onDone));
    } else {
        pumpOnce3(onDone);
    }
}

function pumpOnce3(onDone) {
    if (Global.root.getResponseCount() > window.responseCount) {
        window.setTimeout(() => pumpOnce(onDone), 500);
    } else {
        delete window.doPhantomCheck;
        if (onDone) onDone();
    }
}

///////////////////////////////////////////////////////////////////////////////
// Comment filters

function setFilter(onDone) {
    window.filters = Array.from(Global.root.queryAll(FILTER));
    if (window.filters.length > Global.root.countPosts()) {
        Global.log("Something went wrong");
        Global.log("Not checking " + window.filters.length + " filter(s)");
        Global.log("countPosts " + Global.root.countPosts());
        if (onDone) onDone();
        return;
    }

    window.filters_i = 0;
    window.filters_onDone = onDone;
    if (window.filters.length > 0) {
        Global.log("Checking " + window.filters.length + " filter(s)");
    }

    filterOne();
}

function filterOne() {
    if (window.filters_i < window.filters.length) {
        const link = window.filters[window.filters_i++];
        if (Dom.isTextAllComments(link.textContent)) {
            filterOne();
        } else {
            link.click();
            window.setTimeout(() => setFilter2(link), 100);
        }

        return;
    }

    if (window.filters_onDone) window.filters_onDone();
}

function setFilter2(link) {
    // look for menu items
    let filter = Array.from(document.querySelectorAll(FILTER_MENU));
    if (filter.length == 1) {
        const menus = filter[0].querySelectorAll(FILTER_ITEM);
        let found = false;
        for (var i = 0; i < menus.length; i++) {
            const s = menus[i].querySelector(FILTER_ITEM_INNER);
            if (s && Dom.isTextAllComments(s.textContent)) {
                found = true;
                break;
            }
        }

        if (!found) {
            Global.log(window.filters_i + ": \u0027" + "All comments" + "\u0027 not found.");
            // the menu cannot be closed using the DOM (click, focus),
            // so we just blank it out
            menus[0].closest(FILTER_MENU).outerHTML = "";
        } else {
            const span = menus[i].querySelector(FILTER_ITEM_INNER);
            let text = "";
            if (!!span) {
                text = span.textContent;
            }

            if (text.trim() != link.textContent.trim()) {
                Global.log(window.filters_i + ": changing \u0027" + link.textContent.trim() + "\u0027 to \u0027" + text.trim() + "\u0027");
                // clicking makes the link go away, so use link before clicking
                let post = link.closest(ANY_ARTICLE);
                if (!post) {
                    post = link.closest(ROLE_MAIN);
                }

                menus[i].click();
                window.setTimeout(() => setFilter3(post), 100);
                return;
            }
        }
    } else if (filter.length > 1) {
        Global.log("Comment filter failure! (" + filter.length + ")");
    } else if (filter.length === 0) {
        Global.log(window.filters_i + ": \u0027" + "All comments" + "\u0027 not found. (b)");
    }

    // this could mean we blanked the menu last time (see above)
    // or it could mean menu has not been generated in time.
    // could retry instead, with timeouts
    filterOne();
}

function setFilter3(post) {
    if (!post) {
        Global.log("Something went wrong. Not waiting.");
    }

    if (!post || !!post.querySelector(FILTER)) {
        filterOne();
    } else {
        window.setTimeout(() => setFilter3(post), 100);
    }
}

///////////////////////////////////////////////////////////////////////////////
// Actions

class Actions {
    constructor() {
        this.i = 0;
        this.setUpActions();
    }

    setUpActions() {
        this.actions = [];

        this.actions.push(onDone => ensureCommentsShowing(onDone));

        if ((todo & EXPAND_FILTER) == 0) {
            this.actions.push(onDone => setFilter(onDone));
        }

        // see special case(s) in clickClass()
        this.actions.push(onDone => clickClass(SEE_MORE_BASE, onDone));

        function seeMore(o) {
            // see special case(s) in clickClass()
            o.actions.push(onDone => clickClass(SEE_MORE_COMMENT, onDone));
        }

        seeMore(this);
        this.actions.push(onDone => pumpOnce(onDone));
        seeMore(this);

        this.actions.push(Session.endSession);
        this.actions.push(null);
    }

    doAction() {
        if (this.actions[this.i] !== null) {
            this.actions[this.i](() => window.setTimeout(bind(this, this.doAction), 50));
            this.i++;
        }
    }

    kickOff() {
        this.i = 0;
        this.doAction();
    }
}

///////////////////////////////////////////////////////////////////////////////
// Session

class Session {
    static init() {
        if (window.Global) {
            Global = window.Global;
            Global.escHandler.abort(true);
        } else {
            Session.kickOff();
        }
    }

    static kickOff() {
        Global = {
            escHandler: new EscHandler(),
            cfgHandler: new CfgHandler(),
            logger: new LogWindow(),
            root: new Root()
        };

        Global.log = function(s) {
            Global.logger.log(s);
        };

        window.Global = Global;
        Session.main();
    }

    static main() {
        todo = Settings.getInt(SETTINGS_KEY, todo);

        Global.logger.show();
        Global.escHandler.on();
        Global.cfgHandler.on();
        Root.removeOverlay();
        if (Global.root.determine()) {
            Global.actions = new Actions();
            Global.actions.kickOff();
        } else {
            Session.endSession();
        }
    }

    static endSession() {
        Global.logger.counts();
        if (Global.cfgHandler.shouldConfig()) {
            CfgWindow.showIt();
            return;
        }

        Global.ending = true;
        Global.log("[Press \u0027s\u0027 now for Settings]");
        window.setTimeout(Session.maybeEnd, END_DELAY * 1000);
    }

    static maybeEnd() {
        delete Global.ending;
        if (!Global.cfgHandler.shouldConfig()) {
            Session.trulyEnd();
        }
    }

    static trulyEnd() {
        if (Global.cfg) {
            Global.cfg.hide();
            delete Global.cfg;
        }

        Global.escHandler.off();
        Global.cfgHandler.off();
        Global.logger.hide();
        delete window.Global;
        Global = null;
    }
}

Session.init();
