let todo = 6;

const EXPAND_POST = 1;
const EXPAND_COMMENTS = 2;
const EXPAND_REPLIES = 4;
const EXPAND_XLAT = 8; // not used anymore
const EXPAND_FILTER = 16;

const WAIT_TIME = 100; // in ms
const MAX_WAIT = 20; // in iterations
const END_DELAY = 2.5; // in seconds

// New
const POST_ARTICLE = "[class=\"lzcic4wl\"][role=\"article\"]";
const VIDEO_ARTICLE = "._6x84,[data-pagelet=\"TahoeRightRail\"]";
// not([role]) avoids full-browser videos
const FS_ARTICLE = ".o36gj0jk:not([role=\"navigation\"]),[role=\"complementary\"]";
const NEW_ARTICLE = POST_ARTICLE + "," + FS_ARTICLE + "," + VIDEO_ARTICLE;

// New
// 1: taken from Newspapers.com
// 2: taken from NAF group
// 3: ?
// 4: taken from ManresaRestaurant
const POST_ACTION = ".sjgh65i0 > div > div > div > div > div > span,.jifvfom9[role=\"button\"],.p24jkzn5,.sjgh65i0 > div > div > div > div > div > a > div";

// Classic and New
const POST_ROOT = ".userContentWrapper,.uiScrollableAreaContent," + NEW_ARTICLE;

// Classic and New
const RESPONSE_COUNTER = "[aria-label][role=\"article\"]";

const CLASSIC_GET_CONTENT = "._4sxc";
const CLASSIC_GET_REPLIES = "._4sso";

const NEW_GET_CONTENT = ".fv0vnmcu > .lrazzd5p";
const NEW_GET_COMMENTS = ".bkfpd7mw .jklb3kyz .lrazzd5p";

// Classic
// ._3w53 is for when logged in
// ._6iiv is for theater mode
// ._7a9a is for when not logged in
const SHOW_COMMENTS = "[data-ft=\u0027{\"tn\":\"O\"}\u0027]";
const SINGLE_COMMENT_AREA = "._3w53,._6iiv,._7a9a";

// .uiScrollableAreaContent for theater mode
// .uiStreamStory for playing videos
const FILTER_ROOT = POST_ROOT + ",.uiScrollableAreaContent,.uiStreamStory";
const FILTER_DONE = "h6 ~ ul > li";
const FILTER_ATTR = "data-ordering";
const FILTER_VALUE = "RANKED_UNFILTERED";

// not([aria-haspopup]) is something on my profile page
// not(.jifvfom9) is to avoid starting a post
// not(._4sxc) helps with newspapers.com
const FILTER_NEW = ".bp9cbjyn > .p8dawk7l[role=\"button\"]:not([aria-label]):not([aria-haspopup]):not(.jifvfom9):not(._4sxc)";

// Classic
const CSS_LOGIN_STUFF = "._5hn6, ._67m7, .generic_dialog_modal, .rlt63pii";

// Classic
const BASE_SEE_MORE = ".text_exposed_link .see_more_link_inner";
const EXPOSE_CONTENT = ".text_exposed_link";
// avoid Activity Log time stamps
const CSS_SEE_MORE = ".fss:not(._5shl)";

// New
// not avoids Edit button
const SMN = ".lrazzd5p[role=\"button\"]:not(.m5l1wtfr)";
const SEE_MORE_NEW = POST_ARTICLE + " " + SMN + "," + FS_ARTICLE + " " + SMN + "," + VIDEO_ARTICLE + " " + SMN;

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
            ["In Classic Facebook, click <i>Continue Reading</i> links.", EXPAND_POST],
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
        if (boxes.length === 4) {
            boxes[0].checked = (todo & EXPAND_POST) != 0;
            boxes[1].checked = (todo & EXPAND_COMMENTS) != 0;
            boxes[2].checked = (todo & EXPAND_REPLIES) != 0;
            boxes[3].checked = (todo & EXPAND_FILTER) != 0;
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
            this.log(this.phantoms + " phantom(s)");
        }

        this.log("Responses = " + Global.root.queryAll(RESPONSE_COUNTER).length);
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
        const EXPANDING = "Expanding: ";

        // complicated New case
        const div = Dom.findFirstVisible(document.querySelectorAll(POST_ARTICLE));
        if (!!div) {
            let canPost = !!document.querySelector(POST_ACTION);
            let topOnly = !canPost;
            if (topOnly) {
                // one if 2022 UI in group
                if (Dom.roles("grid") <= 1) {
                    // some profile pages have no post ability and no grid
                    // PinkNews has old stye permalink: no post ability; want topmost
                    topOnly = Dom.roles("contentinfo") == 0;
                } else if (Dom.roles("navigation") == 2) {
                    // if group feed, fall through
                    topOnly = false;
                }
            } else {
                // topOnly; from notifications (private):
                // https://www.facebook.com/groups/163266214168433/?multi_permalinks=510108426150875

                // !topOnly; pinned post:
                // https://www.facebook.com/CyprusMail/

                // !topOnly; new activity (private):
                // https://www.facebook.com/groups/448352062420323

                // !topOnly; no extras:
                // https://www.facebook.com/ManresaRestaurant/

                topOnly = Dom.roles("feed") == 2 && Dom.roles("grid") == 1 && Dom.roles("contentinfo") == 0;
            }

            if (topOnly) {
                Global.log(EXPANDING + "Topmost post");
                this.rootNode = div.parentNode;
                this.usingBody = false;
            }
        }

        if (!this.usingBody) {
            return;
        }

        const USE_PARENT = true;

        let check = [];

        // Classic
        check.push([".uiStreamStory", "Video comments on right", !USE_PARENT]);
        check.push(["div.rhcScroller .uiScrollableAreaContent", "Theater mode", USE_PARENT]);
        check.push([".uiLayer:not(.hidden_elem)", "Overlaid post", !USE_PARENT]);
        check.push([".permalinkPost", "Permalinked post", !USE_PARENT]);
        check.push(["#contentArea", "Classic feed", !USE_PARENT]);

        // New
        check.push(["[data-pagelet=\"TahoeRightRail\"]", "Full-browser video", USE_PARENT]);
        check.push([FS_ARTICLE, "Full-browser", USE_PARENT]);

        // Classic and New
        // order matters; e.g., Classic NAF
        check.push(["[role=\"main\"]", "Main content area", !USE_PARENT]);
        check.push(["[role=\"feed\"]", "Feed", !USE_PARENT]);

        check.find(item => {
            const divs = Dom.filterHidden(document.querySelectorAll(item[0]));
            let div = null;
            if (divs.length == 1) {
                div = divs[0];
            }

            if (divs.length == 2) {
                div = divs[1];
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

    static isClassicVideo() {
        const result = !!document.querySelector(".uiStreamStory");
        return result;
    }

    static prepIfClassicVideo(onDone) {
        let wait = 0;
        if (Root.isClassicVideo()) {
            const links = document.querySelectorAll(SHOW_COMMENTS);
            if (links.length > 0) {
                Global.log("Making sure video comments are showing");
                links[links.length - 1].click();
                wait = 100;
            }
        }

        if (onDone) {
            window.setTimeout(onDone, wait);
        }
    }

    isFullBrowserNew() {
        let result = !!Global.root.query(FS_ARTICLE);
        return result;
    }

    isNewVideoKind() {
        let result = !!Global.root.query(VIDEO_ARTICLE);
        return result;
    }

    isSearchResults() {
        // Classic, New
        let result = !!Global.root.query("#pagelet_group_search,.p8dawk7l[role=\"presentation\"]");
        return result;
    }

    countPosts() {
        if (Root.isClassicVideo()) {
            return 1;
        }

        let filter = Array.from(Global.root.queryAll(POST_ROOT));

        // Classic
        // https://www.facebook.com/jens.farley/posts/1493248944020884:6
        filter = filter.filter(item => !item.querySelector(POST_ROOT));
        return filter.length;
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
        nodes.forEach(item => {
            if (!Dom.isHidden(item)) {
                result.push(item);
            }
        });

        return result;
    }

    static roles(role) {
        return Dom.filterHidden(document.querySelectorAll("[role=\"" + role + "\"]")).length;
    }

    static findFirstVisible(nodes) {
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
            /^Ver%20/,     // Spanish and Portugese (es_LA, es_ES, pt_BR, pt_PT)
            /^Afficher%20/, // French (fr_CA, fr_FR)
            /^عرض%20/,     // Arabic (ar_AR)
            /^Показать%20/, // Russian (ru_RU)
            /^Lihat%20/,      // Indonesian (id_ID)
            /^Tampilkan%20/,  // Indonesian (id_ID)
            /件を表示$/,        // Japanese (ja_JA, ja_KS)
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
            /^Bekijk%20/      // Dutch (nl_BE)
        ];

        return words.some(re => { return s.match(re) != null; });
    }

    static hasTextShare(s) {
        const words = [
            /%20Share$/,   // English (en_US, en_GB, pa_IN, or_IN)
            /%20Shares$/,  // English (en_US, en_GB, pa_IN)
            /%20次分享$/,  // Chinese (zh_TW, zh_CN, zh_HK)
            /次分享$/,   // Chinese (zh_TW, zh_CN, zh_HK)
            /%20सामायिकीकरण$/,  // Marathi (mr_IN)
            /%20शेअर$/,        // Marathi (mr_IN)
            /%20शेयर$/,     // Hindi (hi_IN)
            /%20সহভাগ$/,    // Assamese (as_IN)
            /%20ভাগ-বতৰা$/, // Assamese (as_IN)
            /%20শেয়ার$/,    // Bengali (bn_IN)
            /%20શેર$/,      // Gujarati (gu_IN)
            /%20ସେୟାର୍$/,   // Oriya (or_IN)
            /%20ସେୟାର$/,   // Oriya (or_IN)
            /%20பகிர்வு$/,    // Tamil (ta_IN)
            /%20பகிர்வுகள்$/, // Tamil (ta_IN)
            /%20భాగస్వామ్యం$/, // Telugu (te_IN)
            /%20భాగస్వామ్యాలు$/, // Telugu (te_IN)
            /%20ಹಂಚಿಕೆ$/,      // Kannada (ka_IN)
            /%20ಹಂಚಿಕೆಗಳು$/,   // Kannada (ka_IN)
            /%20പങ്കിടൽ$/,     // Malayalam (ml_IN)
            /%20പങ്കിടലുകൾ$/, // Malayalam (ml_IN)
            /%20compartido$/,  // Spanish (es_LA, es_ES)
            /%20compartida$/,  // Spanish (es_ES)
            /%20partage$/,    // French (fr_CA, fr_FR)
            /%20partages$/,   // French (fr_CA, fr_FR)
            /^مشاركة/,         // Arabic (ar_AR)
            /^مشاركات%20/      // Arabic (ar_AR)
            // lost steam, as I do not think this matters
       ];

       return words.some(re => { return s.match(re) != null; });
    }

    static isTextAllComments(s) {
        const phrases = [
            "All comments".toLowerCase()
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
    if (Global.root.isSearchResults()) {
        Global.log("You must manually drill down into a search result.");

        if (onDone) onDone();
        return;
    }

    let filter = [];
    const n = Global.root.countPosts();
    if (n > 1) {
        Global.log("Examining " + n + " posts");
    }

    Global.root.queryAll(POST_ROOT).forEach(item => {
        // see countPosts for similar nesting check
        if (!item.querySelector(POST_ROOT)) {
            const link = item.querySelector(SHOW_COMMENTS);
            if (link && !item.querySelector(SINGLE_COMMENT_AREA)) {
                filter.push(link);
            }
        }
    });

    if (filter.length > 0) {
        Global.log("Showing comment area for " + filter.length + " post(s)");
        clickAndWait(_NONE, onDone, filter, 0);
    } else {
        if (onDone) onDone();
    }
}

function ensureCommentsShowingNew(onDone) {
    let filter = [];

    let selector = ".cwj9ozl2.tvmbv18p";

    // https://www.facebook.com/photo?fbid=1124898877855180
    if (Global.root.isFullBrowserNew()) {
        selector = "[class=\"cwj9ozl2\"]";
    }

    // https://www.facebook.com/125982670754724/videos/372875816621699/
    if (Global.root.isNewVideoKind()) {
        selector = ".l9j0dhe7.tkr6xdv7.buofh1pr.eg9m0zos";
    }

    Global.root.queryAll(POST_ROOT).forEach(item => {
        if (!item.querySelector(selector)) {
            const link = item.querySelector(".gtad4xkn:first-child .auili1gw[role=\"button\"]");

            if (link && !Dom.hasTextShare(link.textContent)) {
                filter.push(link);
            }
        }
    });

    if (filter.length > 0) {
        Global.log("Showing comment area for " + filter.length + " post(s)");
        clickAndWait(_NONE, onDone, filter, 0);
    } else {
        if (onDone) onDone();
    }
}

function isNewWindow(link) {
    return !!link.querySelector("a[target][href]");
}

function newWindowNow(link) {
    const anchor = link.querySelector("a[target][href]");
    Global.log("New window: " + anchor.textContent);
    if (!window.open(anchor.getAttribute("href"), anchor.getAttribute("target"))) {
        Global.log("New window was blocked!");
    }
}

function clickClass(value, onDone) {
    if (Global.escHandler.shouldAbort()) {
        if (onDone) onDone();
        return;
    }

    let filter = Array.from(Global.root.queryAll(value)).filter(item => {
        if (value === BASE_SEE_MORE) {
            // avoid See More in group right
            if (item.parentNode.closest(".groupsSideMargin")) {
                return false;
            }

            // a clicked-on See More becomes hidden
            if (Dom.isHidden(item)) {
                return false;
            }

            return true;
        }

        if (value === SEE_MORE_NEW) {
            // must have no child nodes
            if (!!item.childElementCount) {
                return false;
            }

            // issues only if link parent is not SPAN
            if (item.parentNode.nodeName != "SPAN") {
                return true;
            }

            // absence of ellipsis means See Less
            if (item.parentNode.parentNode.previousSibling) {
                let full = item.parentNode.parentNode.previousSibling.textContent;
                return full.charCodeAt(full.length - 1) == 8230;
            }
        }

        if (value === EXPOSE_CONTENT) {
            // Continue Reading?
            if (isNewWindow(item)) {
                newWindowNow(item);
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
    return [ CSS_SEE_MORE,
             SEE_MORE_NEW,
             BASE_SEE_MORE,
             EXPOSE_CONTENT ].indexOf(value) >= 0;
}

function getCommentsOrReplies(comments, onDone) {
    if (Global.escHandler.shouldAbort()) {
        if (onDone) onDone();
        return;
    }

    let filter = Array.from(Global.root.queryAll(CLASSIC_GET_CONTENT));
    if (filter.length > 0) {
        if (comments) {
            filter = filter.filter(item => !item.querySelector(CLASSIC_GET_REPLIES));
        } else {
            filter = Array.from(Global.root.queryAll(CLASSIC_GET_REPLIES));
        }
    }

    if (filter.length == 0) {
        filter = Array.from(Global.root.queryAll(NEW_GET_CONTENT));
        if (filter.length > 0) {
            if (comments) {
                filter = Array.from(Global.root.queryAll(NEW_GET_COMMENTS));
            } else {
                // for replies-only, remove 'View more comments'
                filter = filter.filter(item => !!item.parentNode.parentNode.querySelector(".ozuftl9m"));

                // avoid collapse / hide toggle
                filter = filter.filter(function(item) {
                    // if nested, keep it (it's not Hide)
                    if (!!item.closest("ul").parentNode.closest("ul")) {
                        return true;
                    }

                    // if link is first child, and has siblings, it's Hide position
                    item = item.parentNode.parentNode;
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

                // sometimes there's an image before the reply getter (New)
                filter = filter.filter(item => !item.querySelector("[role=\"img\"]"));
            }
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

    if (!label && link.querySelector("._3eol")) {
        label = link.querySelector("._3eol").textContent;
    }

    if (!label) {
        label = link.textContent;
    }

    // chop off some extra stuff if present
    label = label.split("\u00a0\u0020\u00b7")[0];
    label = label.split("\u0020\u00b7")[0];

    // chop off time of reply, if present
    const time = link.querySelector("._3eom");
    if (time && label.endsWith(time.textContent)) {
        label = label.substring(0, label.length - time.textContent.length);
    }

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

    // Classic: showing hidden comment area, not logged in, has filter
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
// Comment filters - Classic

function setFilter(onDone) {
    window.filters = Array.from(Global.root.queryAll("[" + FILTER_ATTR + "]")).filter(item =>
        item.getAttribute(FILTER_ATTR) != FILTER_VALUE);
    window.filters_i = 0;
    window.filters_onDone = onDone;
    if (window.filters.length > 0) {
        Global.log("Changing " + window.filters.length + " Classic filter(s)");
    }

    filterOne();
}

function filterOne() {
    if (window.filters_i < window.filters.length) {
        const link = window.filters[window.filters_i++];
        link.click();
        window.setTimeout(() => setFilter2(link), 100);
    } else {
        if (window.filters_onDone) window.filters_onDone();
    }
}

function setFilter2(link) {
    const menu = document.querySelector("[data-ownerid=\"" + link.id + "\"]");
    if (menu) {
        const item = menu.querySelector("[" + FILTER_ATTR + "=\"" + FILTER_VALUE + "\"]");
        if (item) {
            const post = link.closest(FILTER_ROOT);
            window.setTimeout(() => setFilter3(post, 50));
            item.closest("a").click();
            return;
        }
    }

    link.click();
    filterOne();
}

function setFilter3(post) {
    if (!post.querySelector(FILTER_DONE)) {
        window.setTimeout(() => setFilter3(post), 200);
    } else {
        filterOne();
    }
}

///////////////////////////////////////////////////////////////////////////////
// Comment filters - New

function setFilterNew(onDone) {
    window.filters = Array.from(Global.root.queryAll(FILTER_NEW));

    // kick out translation-related stuff
    window.filters = window.filters.filter(item => !item.closest(".sq6gx45u"));

    // kick out post type selector and profile photo update
    window.filters = window.filters.filter(item => !item.querySelector("h1,svg"));

    if (window.filters > Global.root.countPosts()) {
        Global.log("Something went wrong");
        Global.log("Not checking " + window.filters.length + " New filter(s)");
        if (onDone) onDone;
        return;
    }

    window.filters_i = 0;
    window.filters_onDone = onDone;
    if (window.filters.length > 0) {
        Global.log("Checking " + window.filters.length + " New filter(s)");
    }

    filterOneNew();
}

function filterOneNew() {
    if (window.filters_i < window.filters.length) {
        const link = window.filters[window.filters_i++];
        link.click();
        window.setTimeout(() => setFilterNew2(link), 100);
    } else {
        if (window.filters_onDone) window.filters_onDone();
    }
}

function setFilterNew2(link) {
    // look for menu items
    let filter = Array.from(document.querySelectorAll(".ama3r5zh[role=\"menu\"],.swg4t2nn[role=\"menu\"]"));
    if (filter.length == 1) {
        const menus = filter[0].querySelectorAll("[role=\"menuitem\"]");
        let found = false;
        for (var i = 0; i < menus.length; i++) {
            const s = menus[i].querySelector("span");
            if (s && Dom.isTextAllComments(s.textContent)) {
                found = true;
                break;
            }
        }

        if (!found) {
            Global.log("\u0027" + "All comments" + "\u0027 not found.");
            i = menus.length - 1;
        }

        const span = menus[i].querySelector("span");
        let text = "";
        if (!!span) {
            text = span.textContent;
        }

        if (text.trim() != link.textContent.trim()) {
            // clicking makes the link go away, so use link before clicking
            const post = link.closest(NEW_ARTICLE);
            menus[i].click();
            window.setTimeout(() => setFilterNew3(post), 100);
            return;
        }

        // the menu cannot be closed using the DOM (click, focus),
        // so we just blank it out
        menus[0].closest("[role=\"menu\"]").outerHTML = "";
    }

    // this could mean we blanked the menu last time (see above)
    // or it could mean menu has not been generated in time.
    // could retry instead, with timeouts
    filterOneNew();
}

function setFilterNew3(post) {
    if (!post) {
        Global.log("Something went wrong. Not waiting.");
    }

    if (!post || !!post.querySelector(FILTER_NEW)) {
        filterOneNew();
    } else {
        window.setTimeout(() => setFilterNew3(post), 100);
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

        this.actions.push(onDone => Root.prepIfClassicVideo(onDone));
        this.actions.push(onDone => ensureCommentsShowing(onDone));
        this.actions.push(onDone => ensureCommentsShowingNew(onDone));

        if ((todo & EXPAND_FILTER) == 0) {
            this.actions.push(onDone => setFilter(onDone));
            this.actions.push(onDone => setFilterNew(onDone));
        }

        // check for See More in base post
        this.actions.push(onDone => clickClass(BASE_SEE_MORE, onDone));

        function seeMore(o) {
            // See More links on comments and replies
            // See special case(s) in clickClass()
            o.actions.push(onDone => clickClass(CSS_SEE_MORE, onDone));
            o.actions.push(onDone => clickClass(SEE_MORE_NEW, onDone));
        }

        seeMore(this);

        // check Continue Reading links in base post
        if ((todo & EXPAND_POST) != 0) {
            this.actions.push(onDone => clickClass(EXPOSE_CONTENT, onDone));
        }

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
        Global.root.determine();

        Global.actions = new Actions();
        Global.actions.kickOff();
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
