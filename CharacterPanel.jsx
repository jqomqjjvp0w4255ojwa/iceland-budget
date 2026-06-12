// CharacterPanel.jsx — 角色快速綁定/動態面板 v1.6
//
// 安裝(建議,變成常駐面板):
//   把這個檔案放到 AE 安裝目錄的 Support Files\Scripts\ScriptUI Panels\
//   重開 AE 後,在 Window 選單最下面會出現「角色工具」
// 或臨時使用:File > Scripts > Run Script File...(會開成浮動視窗)
//
// 工作流:
//   1.(標記)點選圖層 → 按對應按鈕:自動改標準名 + 建 control + 掛切換表達式
//      勾「完整綁定」會順便建 face/eye/mouth/ear Null 並 parent
//   2.(一鍵動態)隨機眨眼 / 說話設定 / 呼吸 / 漂浮
//      → 只有閉眼或只有閉嘴的角色會自動改用「縮放擠壓」方案
//   3.(演出)聽到角色開口 → 停在那一格按「開始說話」,結束按「停止說話」
//      → 在 mouth 滑桿上打 HOLD key,切分鏡時邊聽邊點就好

(function (thisObj) {

    // ================= 共用 =================

    function activeComp() {
        var c = app.project.activeItem;
        if (!(c instanceof CompItem)) { alert("請先點一下要操作的合成時間軸。"); return null; }
        return c;
    }

    function findLayer(comp, name) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) return comp.layer(i);
        }
        return null;
    }

    function countByBase(comp, base) {
        var n = 0;
        for (var i = 1; i <= comp.numLayers; i++) {
            var nm = comp.layer(i).name;
            if (nm === base || nm.indexOf(base + " ") === 0) n++;
        }
        return n;
    }

    function ensureControl(comp) {
        var ctrl = findLayer(comp, "control");
        if (!ctrl) {
            ctrl = comp.layers.addNull(comp.duration);
            ctrl.name = "control";
            ctrl.moveToBeginning();
        }
        var fx = ctrl.property("ADBE Effect Parade");
        var sliders = ["eye", "mouth", "眉", "emo"];
        for (var i = 0; i < sliders.length; i++) {
            if (!fx.property(sliders[i])) {
                var s = fx.addProperty("ADBE Slider Control");
                s.name = sliders[i];
            }
        }
        if (!fx.property("face position")) {
            var p = fx.addProperty("ADBE Point Control");
            p.name = "face position";
            p.property(1).setValue([comp.width / 2, comp.height / 2]);
        }
        return ctrl;
    }

    function switchExpr(sliderName, val) {
        return 'sliderValue = thisComp.layer("control").effect("' + sliderName + '")("Slider")\n\n' +
               '// 設置透明度\nsliderValue == ' + val + '? 100 : 0\n';
    }

    function opacityProp(layer) {
        return layer.property("ADBE Transform Group").property("ADBE Opacity");
    }
    function scaleProp(layer) {
        return layer.property("ADBE Transform Group").property("ADBE Scale");
    }

    function blinkWindowLines(seed, minGap, maxGap, frames) {
        return [
            "var minGap = " + minGap + ", maxGap = " + maxGap + ";",
            "var blinkDur = " + frames + " * thisComp.frameDuration;",
            "seedRandom(" + seed + ", true);",
            "var t = 0, blink = 0;",
            "while (t < time) {",
            "  t += random(minGap, maxGap);",
            "  if (time >= t && time < t + blinkDur) { blink = 1; break; }",
            "  t += blinkDur;",
            "}"
        ];
    }

    function uniqueSeed() { return Math.floor(Math.random() * 900000) + 1000; }

    // mouth 滑桿的「說話值」:有「張嘴 2」用 2,否則 1
    function talkValue(comp) {
        return findLayer(comp, "張嘴 2") ? 2 : 1;
    }

    // 在圖層錨點位置建一個「軸」Null,把圖層 parent 上去。
    // 擠壓表達式掛在軸的 Scale 上 → 把軸的 Rotation 轉到跟美術同角度,
    // 擠壓就沿著那個方向,斜的嘴/眼不會歪掉(skew)。
    // 美術圖層會自動反向補償旋轉,所以轉軸時畫面上的圖不會跟著轉。
    function makeAxisNull(comp, lay, axisName) {
        if (lay.parent && lay.parent.name === axisName) return lay.parent; // 已建過
        var axis = comp.layers.addNull(comp.duration);
        axis.name = axisName;
        axis.moveBefore(lay);
        if (lay.parent) axis.parent = lay.parent;
        axis.property("ADBE Transform Group").property("ADBE Position")
            .setValue(lay.property("ADBE Transform Group").property("ADBE Position").value);
        lay.parent = axis; // 指定 parent 時 AE 會保持外觀不跳動
        // 轉軸時美術反向補償,維持原本角度
        lay.property("ADBE Transform Group").property("ADBE Rotate Z").expression =
            "value - parent.transform.rotation // 軸轉、美術不轉";
        return axis;
    }

    // 只有閉嘴圖的角色:自動生一張簡易張嘴(深色橢圓 Shape),
    // 位置疊在閉嘴錨點上,之後走標準閉/張切換。形狀顏色大小自己微調。
    function createOpenMouth(comp, closedLay) {
        var w = 60, h = 40;
        try { w = Math.max(closedLay.width * 0.8, 30); h = Math.max(closedLay.width * 0.55, 20); } catch (e) {}
        var shape = comp.layers.addShape();
        shape.name = "張嘴";
        var grp = shape.property("ADBE Root Vectors Group").addProperty("ADBE Vector Group");
        grp.name = "mouth";
        var ell = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Shape - Ellipse");
        ell.property("ADBE Vector Ellipse Size").setValue([w, h]);
        var fill = grp.property("ADBE Vectors Group").addProperty("ADBE Vector Graphic - Fill");
        fill.property("ADBE Vector Fill Color").setValue([0.23, 0.12, 0.10, 1]); // 深咖啡,請自行調色
        shape.moveBefore(closedLay);
        if (closedLay.parent) shape.parent = closedLay.parent;
        shape.property("ADBE Transform Group").property("ADBE Position")
            .setValue(closedLay.property("ADBE Transform Group").property("ADBE Position").value);
        return shape;
    }

    // ================= 1. 標記 =================

    // 每個標記:基準名 / 滑桿 / 依序的滑桿值(第1個閉嘴=0、第2個=3…照你的慣例)
    var TAGS = {
        "閉眼": { slider: "eye",   vals: [1, 1, 1] },
        "睜眼": { slider: "eye",   vals: [0] },
        "閉嘴": { slider: "mouth", vals: [0, 3] },
        "張嘴": { slider: "mouth", vals: [1, 2] },
        "眉":   { slider: "眉",    vals: [0, 1, 2, 3] },
        "汗":   { slider: "emo",   vals: [1, 2, 3] },
        "耳":   { slider: null },
        "鼻":   { slider: null }
    };

    function ensureRigNulls(comp) {
        function ensureNull(name) {
            var L = findLayer(comp, name);
            if (!L) { L = comp.layers.addNull(comp.duration); L.name = name; }
            return L;
        }
        var faceN = ensureNull("face"), eyeN = ensureNull("eye"),
            mouthN = ensureNull("mouth"), earN = ensureNull("ear");
        faceN.property("ADBE Transform Group").property("ADBE Position").expression =
            'thisComp.layer("control").effect("face position")("Point")';
        if (!eyeN.parent) eyeN.parent = faceN;
        if (!mouthN.parent) mouthN.parent = faceN;
        return { face: faceN, eye: eyeN, mouth: mouthN, ear: earN };
    }

    function doTag(base, fullRig) {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先在時間軸選取要標記的圖層,再按「" + base + "」。"); return; }

        app.beginUndoGroup("標記 " + base);
        try {
            ensureControl(comp);
            var nulls = fullRig ? ensureRigNulls(comp) : null;
            var tag = TAGS[base];

            for (var i = 0; i < sel.length; i++) {
                var lay = sel[i];
                var idx = countByBase(comp, base); // 已有幾個同名 → 決定編號與滑桿值
                lay.name = (idx === 0) ? base : base + " " + (idx + 1);

                if (tag.slider) {
                    var v = tag.vals[Math.min(idx, tag.vals.length - 1)];
                    opacityProp(lay).expression = switchExpr(tag.slider, v);
                }
                if (nulls && !lay.parent) {
                    if (base === "耳") lay.parent = nulls.ear;
                    else if (base === "鼻") lay.parent = nulls.face;
                    else if (tag.slider === "eye" || tag.slider === "眉") lay.parent = nulls.eye;
                    else if (tag.slider === "mouth") lay.parent = nulls.mouth;
                }
            }
        } finally { app.endUndoGroup(); }
    }

    // ---- 特殊表情(暈眼、X眼、哭嚎嘴…):掛到滑桿的下一個空值 ----

    function nextSliderValue(comp, sliderName) {
        // 標準慣例已占用的最大值
        var reserved = { eye: 1, mouth: 3, "眉": 3, emo: 3 };
        var maxV = (reserved[sliderName] !== undefined) ? reserved[sliderName] : 0;
        for (var i = 1; i <= comp.numLayers; i++) {
            try {
                var op = opacityProp(comp.layer(i));
                if (!op.expressionEnabled) continue;
                var ex = op.expression;
                if (ex.indexOf('effect("' + sliderName + '")') === -1) continue;
                // 注意:ExtendScript 不能寫 /==.../ 開頭的正則字面量,會被誤認成 /= 運算子
                var m = ex.match(new RegExp("==\\s*(\\d+)"));
                if (m && parseInt(m[1], 10) > maxV) maxV = parseInt(m[1], 10);
            } catch (e) {}
        }
        return maxV + 1;
    }

    function doSpecialTag() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先選取特殊表情的圖層(暈眼、X眼、哭嚎嘴…)再按。"); return; }
        var sliderName = prompt("掛在哪個滑桿?(eye / mouth / 眉 / emo)", "eye");
        if (sliderName === null) return;
        if (sliderName !== "eye" && sliderName !== "mouth" && sliderName !== "眉" && sliderName !== "emo") {
            alert("滑桿名稱要是 eye / mouth / 眉 / emo 其中之一。"); return;
        }
        app.beginUndoGroup("特殊狀態標記");
        try {
            ensureControl(comp);
            var v = nextSliderValue(comp, sliderName);
            var vIn = prompt("用哪個滑桿值?(這個滑桿下一個空值是 " + v + ")", String(v));
            if (vIn === null) return;
            v = parseInt(vIn, 10); if (isNaN(v)) return;
            var base = prompt("圖層命名(方便之後辨認,例:暈眼):", sel[0].name);
            if (base === null) return;
            for (var i = 0; i < sel.length; i++) {
                if (base !== "") sel[i].name = (i === 0) ? base : base + " " + (i + 1);
                opacityProp(sel[i]).expression = switchExpr(sliderName, v);
            }
            alert("完成!演出時把 control > " + sliderName + " 滑桿切到 " + v +
                  " 就會顯示「" + base + "」。\n(滑桿 key 記得用 HOLD)");
        } finally { app.endUndoGroup(); }
    }

    // ================= 2. 一鍵動態 =================

    function doBlink() {
        var comp = activeComp(); if (!comp) return;
        app.beginUndoGroup("隨機眨眼");
        try {
            var closed = findLayer(comp, "閉眼");
            if (closed) {
                // 標準方案:control 的 eye 滑桿掛隨機眨眼(保留手動 key)
                var ctrl = ensureControl(comp);
                var slider = ctrl.property("ADBE Effect Parade").property("eye").property(1);
                var lines = ["// === 隨機眨眼(面板自動加入)==="]
                    .concat(blinkWindowLines(uniqueSeed(), 2.5, 6, 7))
                    .concat(["Math.max(value, blink) // 保留手動 key 的演出"]);
                slider.expression = lines.join("\n");
                alert("已在 control > eye 滑桿掛上隨機眨眼。\n手動打的 key 會保留(取最大值疊加)。");
            } else {
                // 備援方案:沒有閉眼圖層 → 對「睜眼/眼」做縮放擠壓眨眼(透過眼軸,斜眼不會歪)
                var eyeLay = findLayer(comp, "睜眼") || findLayer(comp, "眼") ||
                             (comp.selectedLayers.length ? comp.selectedLayers[0] : null);
                if (!eyeLay) { alert("找不到「閉眼」「睜眼」「眼」圖層。\n請先標記,或選取眼睛圖層後再按一次。"); return; }
                var axis = makeAxisNull(comp, eyeLay, "眼軸");
                var lines2 = ["// === 隨機眨眼:縮放擠壓版(此角色沒有閉眼圖) ==="]
                    .concat(blinkWindowLines(uniqueSeed(), 2.5, 6, 7))
                    .concat(["blink ? [value[0], value[1] * 0.08, value[2]] : value"]);
                scaleProp(axis).expression = lines2.join("\n");
                alert("此角色沒有「閉眼」圖 → 已建「眼軸」Null 套擠壓眨眼(作用在「" + eyeLay.name + "」上)。\n\n" +
                      "眼睛如果是斜的:把「眼軸」的 Rotation 轉到跟眼睛同角度即可,\n" +
                      "美術不會跟著轉,擠壓會沿眼睛的方向、不會歪。");
            }
        } finally { app.endUndoGroup(); }
    }

    function doTalkSetup() {
        var comp = activeComp(); if (!comp) return;
        app.beginUndoGroup("說話設定");
        try {
            ensureControl(comp);
            var open2 = findLayer(comp, "張嘴 2"), open1 = findLayer(comp, "張嘴"),
                closed = findLayer(comp, "閉嘴");

            function squashExpr(activeVal) {
                return [
                    "// === 說話擠壓(mouth 滑桿 == " + activeVal + " 時啟動) ===",
                    's = thisComp.layer("control").effect("mouth")("Slider");',
                    "var speed = 9, amp = 45; // 開合速度 / 幅度(%)",
                    "if (s == " + activeVal + ") {",
                    "  var k = 1 - (amp / 100) * Math.abs(Math.sin(time * speed));",
                    "  [value[0], value[1] * k, value[2]];",
                    "} else { value; }"
                ].join("\n");
            }

            var target = open2 || open1;
            var v, generated = false;

            if (!target && closed) {
                // 只有閉嘴圖:自動生一張簡易張嘴,之後走標準閉/張切換
                target = createOpenMouth(comp, closed);
                opacityProp(target).expression = switchExpr("mouth", 1);
                opacityProp(closed).expression = switchExpr("mouth", 0);
                v = 1;
                generated = true;
            } else if (target) {
                v = open2 ? 2 : 1;
            } else {
                alert("找不到「張嘴」或「閉嘴」圖層,請先標記嘴巴。");
                return;
            }

            // 擠壓掛在「嘴軸」Null 上,斜的嘴不會歪
            var axis = makeAxisNull(comp, target, "嘴軸");
            scaleProp(axis).expression = squashExpr(v);

            var msg = "說話設定完成:mouth 滑桿 = " + v + " 時「" + target.name + "」會自動開合,= 0 是閉嘴。\n" +
                      "用下面的「開始/停止說話」按鈕打 key 即可。\n\n" +
                      "嘴如果是斜的:把「嘴軸」的 Rotation 轉到跟嘴同角度,\n" +
                      "美術不會跟著轉,開合就會沿嘴的方向、不會歪。";
            if (generated) {
                msg += "\n\n此角色原本只有閉嘴圖,我生了一個深色橢圓 Shape 當「張嘴」,\n" +
                       "請花十秒調一下它的大小和顏色,讓它貼合畫風。";
            }
            alert(msg);
        } finally { app.endUndoGroup(); }
    }

    function doBreath() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先選取身體圖層再按「呼吸」。"); return; }
        app.beginUndoGroup("呼吸");
        try {
            for (var i = 0; i < sel.length; i++) {
                scaleProp(sel[i]).expression = [
                    "// === 呼吸(面板自動加入) ===",
                    "var amp = 1.5, period = 3; // 幅度(%) / 週期(秒)",
                    "seedRandom(index, true);",
                    "var ph = random(0, period); // 每個圖層相位錯開",
                    "[value[0], value[1] + amp * Math.sin((time + ph) * 2 * Math.PI / period), value[2]]"
                ].join("\n");
            }
        } finally { app.endUndoGroup(); }
        alert("已套呼吸到 " + sel.length + " 個圖層(Scale 上下 1.5%)。\n提醒:錨點在底部效果最好。");
    }

    function doFloat() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先選取圖層再按「漂浮」。"); return; }
        app.beginUndoGroup("漂浮");
        try {
            for (var i = 0; i < sel.length; i++) {
                sel[i].property("ADBE Transform Group").property("ADBE Position").expression = [
                    "// === 上下漂浮(面板自動加入) ===",
                    "var amp = 10, period = 2.5; // 幅度(px) / 週期(秒)",
                    "seedRandom(index, true);",
                    "var ph = random(0, period);",
                    "value + [0, amp * Math.sin((time + ph) * 2 * Math.PI / period)]"
                ].join("\n");
            }
        } finally { app.endUndoGroup(); }
        alert("已套漂浮到 " + sel.length + " 個圖層。");
    }

    // ================= 3. 演出:說話 key =================

    function setMouthKey(talking) {
        var comp = activeComp(); if (!comp) return;
        app.beginUndoGroup(talking ? "開始說話" : "停止說話");
        try {
            var ctrl = ensureControl(comp);
            var slider = ctrl.property("ADBE Effect Parade").property("mouth").property(1);
            var v = talking ? talkValue(comp) : 0;
            slider.setValueAtTime(comp.time, v);
            // 滑桿切換一定要 HOLD,不然中間值會讓所有嘴都消失
            var k = slider.nearestKeyIndex(comp.time);
            slider.setInterpolationTypeAtKey(k,
                KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
        } finally { app.endUndoGroup(); }
    }

    // ================= 4. 表達式工具 =================

    var PROP_CHOICES = [
        { label: "位置",     match: "ADBE Position" },
        { label: "縮放",     match: "ADBE Scale" },
        { label: "旋轉",     match: "ADBE Rotate Z" },
        { label: "不透明度", match: "ADBE Opacity" },
        { label: "錨點",     match: "ADBE Anchor Point" }
    ];

    // 收集要套表達式的屬性:
    //   時間軸有「選取屬性」(反白 Position 之類)→ 套在那些屬性上
    //   只選圖層 → 套在下拉選單指定的變形屬性上
    function getExprTargets(comp, dropdownIndex) {
        var sel = comp.selectedLayers;
        if (sel.length === 0) return null;
        var props = [], i, j;
        for (i = 0; i < sel.length; i++) {
            var sp;
            try { sp = sel[i].selectedProperties; } catch (e) { sp = []; }
            for (j = 0; j < sp.length; j++) {
                if (sp[j].propertyType === PropertyType.PROPERTY && sp[j].canSetExpression) props.push(sp[j]);
            }
        }
        if (props.length > 0) return props;
        var match = PROP_CHOICES[dropdownIndex].match;
        for (i = 0; i < sel.length; i++) {
            try {
                var p = sel[i].property("ADBE Transform Group").property(match);
                if (p && p.canSetExpression) props.push(p);
            } catch (e) {}
        }
        return props;
    }

    function applyExprToSelection(exprText, dropdownIndex, undoName) {
        var comp = activeComp(); if (!comp) return;
        var props = getExprTargets(comp, dropdownIndex);
        if (!props) { alert("先選取圖層(或直接反白要套的屬性)再按按鈕。"); return; }
        if (props.length === 0) { alert("選取的圖層上找不到可套表達式的屬性。"); return; }
        var ok = 0, fail = [];
        app.beginUndoGroup(undoName);
        try {
            for (var i = 0; i < props.length; i++) {
                try { props[i].expression = exprText; ok++; }
                catch (e) { fail.push(props[i].parentProperty ? props[i].name : "?"); }
            }
        } finally { app.endUndoGroup(); }
        var msg = (exprText === "" ? "已清除 " : "已套用到 ") + ok + " 個屬性。";
        if (fail.length) msg += "\n套不上的:" + fail.join("、") + "(表達式跟屬性維度可能不合)";
        alert(msg);
    }

    // ================= 5. 快速命名 + 控制 NULL =================

    var NAME_SECTION = "CharacterPanel_QuickNames2";
    var DEFAULT_NAMES = ["頭", "身體", "屁股", "尾巴",
                         "手", "上臂", "下臂", "帽子",
                         "腳", "大腿", "小腿", "包包"];

    function namesSave(list) {
        try {
            app.settings.saveSetting(NAME_SECTION, "count", String(list.length));
            for (var i = 0; i < list.length; i++)
                app.settings.saveSetting(NAME_SECTION, "n_" + i, encodeURIComponent(list[i]));
        } catch (e) {}
    }

    function namesLoad() {
        var list = [];
        try {
            if (!app.settings.haveSetting(NAME_SECTION, "count")) {
                namesSave(DEFAULT_NAMES);
                return DEFAULT_NAMES.slice(0);
            }
            var n = parseInt(app.settings.getSetting(NAME_SECTION, "count"), 10) || 0;
            for (var i = 0; i < n; i++)
                list.push(decodeURIComponent(app.settings.getSetting(NAME_SECTION, "n_" + i)));
        } catch (e) {}
        return list;
    }

    function isAllDigits(s) {
        if (s.length === 0) return false;
        for (var i = 0; i < s.length; i++) {
            var c = s.charCodeAt(i);
            if (c < 48 || c > 57) return false;
        }
        return true;
    }

    // 數「手」「手1」「手2」「手 2」這類都算同一家族
    function nameCount(comp, base) {
        var n = 0;
        for (var i = 1; i <= comp.numLayers; i++) {
            var nm = comp.layer(i).name;
            if (nm === base) { n++; continue; }
            if (nm.indexOf(base) === 0) {
                var rest = nm.substring(base.length);
                if (rest.charAt(0) === " ") rest = rest.substring(1);
                if (isAllDigits(rest)) n++;
            }
        }
        return n;
    }

    // 編號規則(配合不分左右的習慣):
    //   單選且沒有同名 → 「手」
    //   多選 → 一次編好「手1、手2…」
    //   已有同名 → 接著編下一號
    function doRename(base) {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先選取圖層,再點名稱按鈕。"); return; }
        app.beginUndoGroup("更名 " + base);
        try {
            var existing = nameCount(comp, base);
            if (sel.length === 1 && existing === 0) {
                sel[0].name = base;
            } else {
                for (var i = 0; i < sel.length; i++) {
                    sel[i].name = base + (existing + i + 1); // 手1、手2…
                }
            }
        } finally { app.endUndoGroup(); }
    }

    // 控制用 NULL:建在圖層錨點位置,圖層 parent 上去。
    // 原圖層留給微動表達式(呼吸/漂浮/wiggle),劇情動作 key 打在 NULL 上,兩邊不打架。
    function makeCtrlNull(comp, lay, nullName) {
        var n = comp.layers.addNull(comp.duration);
        n.name = nullName;
        n.moveBefore(lay);
        if (lay.parent) n.parent = lay.parent;
        n.property("ADBE Transform Group").property("ADBE Position")
            .setValue(lay.property("ADBE Transform Group").property("ADBE Position").value);
        lay.parent = n; // 指定 parent 時 AE 會保持外觀不跳動
        return n;
    }

    function doNullEach() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers.slice(0); // 先複製,建 NULL 過程會動到選取
        if (sel.length === 0) { alert("先選取要加控制 NULL 的圖層。"); return; }
        app.beginUndoGroup("各建控制 NULL");
        try {
            for (var i = 0; i < sel.length; i++) {
                var base = sel[i].name + "_null";
                var idx = countByBase(comp, base);
                makeCtrlNull(comp, sel[i], (idx === 0) ? base : base + " " + (idx + 1));
            }
        } finally { app.endUndoGroup(); }
    }

    function doNullShared() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers.slice(0);
        if (sel.length === 0) { alert("先選取要綁在同一個 NULL 下的圖層。"); return; }
        var nm = prompt("這個控制 NULL 的名字:", "NULL");
        if (!nm) return;
        app.beginUndoGroup("共建控制 NULL");
        try {
            var n = makeCtrlNull(comp, sel[0], nm);
            for (var i = 1; i < sel.length; i++) sel[i].parent = n;
        } finally { app.endUndoGroup(); }
        alert(sel.length + " 個圖層已綁到「" + nm + "」之下,劇情動作打在它身上。");
    }

    // ================= 6. 節奏調整 =================

    // 遞迴收集「有 2 個以上 key 且掛著 loopOut」的屬性(含 Puppet pin)
    function scanLoopProps(group, out) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p;
            try { p = group.property(i); } catch (e) { continue; }
            if (!p) continue;
            if (p.propertyType === PropertyType.PROPERTY) {
                try {
                    if (p.numKeys >= 2 && p.expressionEnabled && p.expression.indexOf("loopOut") !== -1) out.push(p);
                } catch (e) {}
            } else {
                try { scanLoopProps(p, out); } catch (e) {}
            }
        }
    }

    // 循環 key 節奏:輸入「一趟幾格」,把選取圖層上所有 loop 的 key 重新等比排時間
    function retimeLoopKeys() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先選取有循環 key 的圖層(嘴、呼吸、Puppet 都可以)。"); return; }
        var fIn = prompt("循環一趟要幾格?(第一個到最後一個 key 的距離)", "7");
        if (fIn === null) return;
        var frames = parseFloat(fIn);
        if (isNaN(frames) || frames <= 0) { alert("要輸入正數。"); return; }
        var newSpan = frames * comp.frameDuration;

        var count = 0;
        app.beginUndoGroup("循環 key 節奏");
        try {
            for (var s = 0; s < sel.length; s++) {
                var props = [];
                scanLoopProps(sel[s], props);
                for (var p = 0; p < props.length; p++) {
                    var prop = props[p];
                    var n = prop.numKeys;
                    var t1 = prop.keyTime(1);
                    var oldSpan = prop.keyTime(n) - t1;
                    if (oldSpan <= 0) continue;
                    var times = [], vals = [];
                    for (var k = 1; k <= n; k++) {
                        times.push(t1 + (prop.keyTime(k) - t1) * newSpan / oldSpan);
                        vals.push(prop.keyValue(k));
                    }
                    for (var r = n; r >= 1; r--) prop.removeKey(r);
                    for (var a = 0; a < n; a++) prop.setValueAtTime(times[a], vals[a]);
                    count++;
                }
            }
        } finally { app.endUndoGroup(); }
        alert(count === 0 ? "選取的圖層上找不到「key + loopOut」的循環屬性。"
                          : "已重排 " + count + " 個循環屬性,一趟 = " + frames + " 格。");
    }

    // 在表達式文字裡找「label + 數字」,把數字乘上倍率
    function scaleNumber(ex, label, factor) {
        var idx = ex.indexOf(label);
        if (idx === -1) return null;
        var start = idx + label.length, end = start;
        while (end < ex.length && "0123456789.".indexOf(ex.charAt(end)) !== -1) end++;
        var num = parseFloat(ex.substring(start, end));
        if (isNaN(num)) return null;
        var v = Math.round(num * factor * 100) / 100;
        return ex.substring(0, idx) + label + v + ex.substring(end);
    }

    // 遞迴收集有表達式的屬性
    function scanExprProps(group, out) {
        for (var i = 1; i <= group.numProperties; i++) {
            var p;
            try { p = group.property(i); } catch (e) { continue; }
            if (!p) continue;
            if (p.propertyType === PropertyType.PROPERTY) {
                try { if (p.expressionEnabled && p.expression !== "") out.push(p); } catch (e) {}
            } else {
                try { scanExprProps(p, out); } catch (e) {}
            }
        }
    }

    // 表達式倍速:speed/wiggle 乘上倍率、period 除以倍率(對面板生的說話/呼吸/漂浮都有效)
    function retimeExprSpeed() {
        var comp = activeComp(); if (!comp) return;
        var sel = comp.selectedLayers;
        if (sel.length === 0) { alert("先選取掛了動態表達式的圖層。"); return; }
        var mIn = prompt("倍速?(2 = 快兩倍,0.5 = 慢一半)", "1.5");
        if (mIn === null) return;
        var m = parseFloat(mIn);
        if (isNaN(m) || m <= 0) { alert("要輸入正數。"); return; }

        var count = 0;
        app.beginUndoGroup("表達式倍速");
        try {
            for (var s = 0; s < sel.length; s++) {
                var props = [];
                scanExprProps(sel[s], props);
                for (var p = 0; p < props.length; p++) {
                    var ex = props[p].expression, changed = false, r;
                    r = scaleNumber(ex, "var speed = ", m);     if (r !== null) { ex = r; changed = true; }
                    r = scaleNumber(ex, "period = ", 1 / m);    if (r !== null) { ex = r; changed = true; }
                    r = scaleNumber(ex, "wiggle(", m);          if (r !== null) { ex = r; changed = true; }
                    if (changed) { props[p].expression = ex; count++; }
                }
            }
        } finally { app.endUndoGroup(); }
        alert(count === 0 ? "選取的圖層上找不到可調速的表達式(speed / period / wiggle)。"
                          : "已調整 " + count + " 個表達式,倍速 ×" + m + "。");
    }

    // ---- 常用表達式庫(存在 AE 偏好設定,跨專案永久保留) ----

    var LIB_SECTION = "CharacterPanel_ExprLib";

    function libSave(items) {
        try {
            app.settings.saveSetting(LIB_SECTION, "count", String(items.length));
            for (var i = 0; i < items.length; i++) {
                app.settings.saveSetting(LIB_SECTION, "name_" + i, encodeURIComponent(items[i].name));
                app.settings.saveSetting(LIB_SECTION, "expr_" + i, encodeURIComponent(items[i].expr));
            }
        } catch (e) {}
    }

    function libLoad() {
        var items = [];
        try {
            if (!app.settings.haveSetting(LIB_SECTION, "count")) {
                // 第一次使用先放兩個範例
                items = [
                    { name: "持續旋轉(暈眼用)", expr: "value + time * 180" },
                    { name: "驚嚇震動", expr: "wiggle(12, 6)" }
                ];
                libSave(items);
                return items;
            }
            var n = parseInt(app.settings.getSetting(LIB_SECTION, "count"), 10) || 0;
            for (var i = 0; i < n; i++) {
                items.push({
                    name: decodeURIComponent(app.settings.getSetting(LIB_SECTION, "name_" + i)),
                    expr: decodeURIComponent(app.settings.getSetting(LIB_SECTION, "expr_" + i))
                });
            }
        } catch (e) {}
        return items;
    }

    // ================= UI =================

    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel) ? thisObj
                : new Window("palette", "角色工具 v1.6", undefined, { resizeable: true });

        pal.orientation = "column";
        pal.alignChildren = ["fill", "fill"];
        pal.spacing = 4; pal.margins = 6;

        // 分頁籤排版,壓低面板高度
        var tabs = pal.add("tabbedpanel");
        tabs.alignChildren = ["fill", "fill"];

        // ScriptUI 沒有原生捲軸 → 手工做:內容放在群組裡,
        // 分頁高度不夠時右側出現捲軸,拖動時把內容群組往上移
        var scrollTabs = [];
        function makeTab(title) {
            var tab = tabs.add("tab", undefined, title);
            tab.orientation = "row";
            tab.alignChildren = ["left", "top"];
            tab.margins = 6; tab.spacing = 2;
            var content = tab.add("group");
            content.orientation = "column";
            content.alignChildren = ["fill", "top"];
            content.spacing = 6;
            var sb = tab.add("scrollbar");
            sb.preferredSize.width = 14;
            sb.alignment = ["right", "fill"];
            sb.minvalue = 0; sb.maxvalue = 0; sb.value = 0;
            tab.__c = content; tab.__sb = sb; tab.__baseY = 0;
            sb.onChanging = function () {
                content.location = [content.location.x, Math.round(tab.__baseY - sb.value)];
            };
            scrollTabs.push(tab);
            return content;
        }

        function updateScrollbars() {
            for (var i = 0; i < scrollTabs.length; i++) {
                var tab = scrollTabs[i], c = tab.__c, sb = tab.__sb;
                try {
                    tab.__baseY = c.location.y; // 重新排版後的基準位置
                    var overflow = (c.location.y + c.size.height) - (tab.size.height - 6);
                    if (overflow > 0) {
                        sb.maxvalue = overflow;
                        sb.value = 0;
                        sb.visible = true;
                    } else {
                        sb.value = 0;
                        sb.visible = false;
                    }
                } catch (e) {}
            }
        }
        tabs.onChange = updateScrollbars;
        pal.__updateScroll = updateScrollbars;

        // --- 標記 ---
        var p1 = makeTab("標記");
        p1.add("statictext", undefined, "先選圖層再按按鈕:  [v1.6]");
        var rowA = p1.add("group"); var rowB = p1.add("group");
        var tagOrder = ["閉眼", "睜眼", "閉嘴", "張嘴", "眉", "汗", "耳", "鼻"];
        var fullRigCheck;
        for (var i = 0; i < tagOrder.length; i++) {
            var row = (i < 4) ? rowA : rowB;
            (function (base) {
                var b = row.add("button", undefined, base);
                b.preferredSize.width = 52;
                b.onClick = function () { doTag(base, fullRigCheck.value); };
            })(tagOrder[i]);
        }
        var bSpec = rowB.add("button", undefined, "特殊…");
        bSpec.preferredSize.width = 52;
        bSpec.onClick = doSpecialTag;
        fullRigCheck = p1.add("checkbox", undefined, "完整綁定(建 face/eye/mouth/ear Null 並 parent)");
        fullRigCheck.value = false;

        // --- 命名 / 控制 NULL ---
        var p5 = makeTab("命名");

        var rowSuf = p5.add("group");
        rowSuf.add("statictext", undefined, "選圖層 → 點名稱更名。字尾:");
        var sufNone = rowSuf.add("radiobutton", undefined, "無");
        var sufF    = rowSuf.add("radiobutton", undefined, "前");
        var sufB    = rowSuf.add("radiobutton", undefined, "後");
        sufNone.value = true;
        function suffix() { return sufF.value ? "前" : (sufB.value ? "後" : ""); }

        var nameList = namesLoad();
        var nameGrid = p5.add("group");
        nameGrid.orientation = "column"; nameGrid.alignChildren = ["left", "top"]; nameGrid.spacing = 4;

        function rebuildNames() {
            while (nameGrid.children.length > 0) nameGrid.remove(nameGrid.children[0]);
            var row = null;
            for (var i = 0; i < nameList.length; i++) {
                if (i % 4 === 0) row = nameGrid.add("group");
                (function (base) {
                    var b = row.add("button", undefined, base);
                    b.preferredSize.width = 52;
                    b.onClick = function () { doRename(base + suffix()); };
                })(nameList[i]);
            }
            pal.layout.layout(true);
            updateScrollbars();
        }
        rebuildNames();

        var rowNm = p5.add("group");
        var bNmAdd = rowNm.add("button", undefined, "+ 新增名稱"); bNmAdd.preferredSize.width = 90;
        var bNmDel = rowNm.add("button", undefined, "− 刪除名稱"); bNmDel.preferredSize.width = 90;
        bNmAdd.onClick = function () {
            var nm = prompt("新增常用名稱:", "");
            if (!nm) return;
            nameList.push(nm); namesSave(nameList); rebuildNames();
        };
        bNmDel.onClick = function () {
            var nm = prompt("要刪除哪個名稱?(輸入按鈕上的字)", "");
            if (!nm) return;
            for (var i = 0; i < nameList.length; i++) {
                if (nameList[i] === nm) { nameList.splice(i, 1); namesSave(nameList); rebuildNames(); return; }
            }
            alert("清單裡沒有「" + nm + "」。");
        };

        p5.add("statictext", undefined, "控制 NULL(原圖層做微動,NULL 照劇情動):");
        var rowNu = p5.add("group");
        var bNuEach   = rowNu.add("button", undefined, "各建 NULL");     bNuEach.preferredSize.width = 110;
        var bNuShared = rowNu.add("button", undefined, "共用一個 NULL"); bNuShared.preferredSize.width = 110;
        bNuEach.onClick = doNullEach;
        bNuShared.onClick = doNullShared;

        // --- 動態 ---
        var p2 = makeTab("動態");
        var rowC = p2.add("group"); var rowD = p2.add("group");
        var bBlink = rowC.add("button", undefined, "隨機眨眼");   bBlink.preferredSize.width = 110;
        var bTalk  = rowC.add("button", undefined, "說話設定");   bTalk.preferredSize.width = 110;
        var bBr    = rowD.add("button", undefined, "呼吸(選取)"); bBr.preferredSize.width = 110;
        var bFl    = rowD.add("button", undefined, "漂浮(選取)"); bFl.preferredSize.width = 110;
        bBlink.onClick = doBlink;
        bTalk.onClick  = doTalkSetup;
        bBr.onClick    = doBreath;
        bFl.onClick    = doFloat;

        p2.add("statictext", undefined, "節奏(用數字調,不用憑感覺拉 key):");
        var rowRt = p2.add("group");
        var bLoopT = rowRt.add("button", undefined, "循環 key 節奏…"); bLoopT.preferredSize.width = 110;
        var bExprT = rowRt.add("button", undefined, "表達式倍速…");   bExprT.preferredSize.width = 110;
        bLoopT.onClick = retimeLoopKeys;
        bExprT.onClick = retimeExprSpeed;

        // --- 演出(遠端 key:人待在主場景,key 寫進角色的 control) ---
        var p3 = makeTab("演出");

        var rigComps = [];
        var rowChar = p3.add("group");
        rowChar.add("statictext", undefined, "角色:");
        var charDrop = rowChar.add("dropdownlist", undefined, []);
        charDrop.preferredSize.width = 150;
        var bScan = rowChar.add("button", undefined, "↻"); bScan.preferredSize.width = 30;

        function refreshRigComps() {
            rigComps = [];
            charDrop.removeAll();
            try {
                for (var i = 1; i <= app.project.numItems; i++) {
                    var it = app.project.item(i);
                    if (it instanceof CompItem && findLayer(it, "control")) {
                        rigComps.push(it);
                        var folder = (it.parentFolder && it.parentFolder.name !== "Root")
                                   ? "  [" + it.parentFolder.name + "]" : "";
                        charDrop.add("item", it.name + folder);
                    }
                }
            } catch (e) {}
            if (charDrop.items.length > 0) charDrop.selection = 0;
        }
        refreshRigComps();
        bScan.onClick = refreshRigComps;

        function targetComp() {
            if (!charDrop.selection) { alert("先按 ↻ 掃描專案,再從下拉選角色(有 control 的合成)。"); return null; }
            return rigComps[charDrop.selection.index];
        }

        // 用「目前開著的合成」的時間下 key(你們所有合成都是同一條全片時間軸)
        function nowTime(tc) {
            var a = app.project.activeItem;
            return (a instanceof CompItem) ? a.time : tc.time;
        }

        function remoteKey(sliderName, val) {
            var tc = targetComp(); if (!tc) return;
            app.beginUndoGroup("演出 key:" + sliderName);
            try {
                ensureControl(tc);
                var slider = findLayer(tc, "control")
                    .property("ADBE Effect Parade").property(sliderName).property(1);
                var t = nowTime(tc);
                slider.setValueAtTime(t, val);
                var k = slider.nearestKeyIndex(t);
                slider.setInterpolationTypeAtKey(k,
                    KeyframeInterpolationType.HOLD, KeyframeInterpolationType.HOLD);
            } finally { app.endUndoGroup(); }
        }

        p3.add("statictext", undefined, "停在目前時間,點按鈕(不用進頭合成):");
        var rowT = p3.add("group");
        var bOn  = rowT.add("button", undefined, "▶ 開始說話"); bOn.preferredSize.width = 110;
        var bOff = rowT.add("button", undefined, "■ 停止說話"); bOff.preferredSize.width = 110;
        bOn.onClick  = function () { var tc = targetComp(); if (!tc) return; remoteKey("mouth", talkValue(tc)); };
        bOff.onClick = function () { remoteKey("mouth", 0); };

        var rowX = p3.add("group");
        rowX.add("statictext", undefined, "滑桿:");
        var sldDrop = rowX.add("dropdownlist", undefined, ["eye", "mouth", "眉", "emo"]);
        sldDrop.selection = 0;
        rowX.add("statictext", undefined, "值:");
        var valBox = rowX.add("edittext", undefined, "1");
        valBox.preferredSize.width = 36;
        var bKey = rowX.add("button", undefined, "下 HOLD key");
        bKey.onClick = function () {
            var v = parseFloat(valBox.text);
            if (isNaN(v)) { alert("值要是數字。"); return; }
            remoteKey(sldDrop.selection.text, v);
        };

        // --- 表達式工具 ---
        var p4 = makeTab("表達式");

        var rowProp = p4.add("group");
        rowProp.add("statictext", undefined, "套在:");
        var propDrop = rowProp.add("dropdownlist", undefined, (function () {
            var a = [];
            for (var i = 0; i < PROP_CHOICES.length; i++) a.push(PROP_CHOICES[i].label);
            return a;
        })());
        propDrop.selection = 0;
        rowProp.add("statictext", undefined, "(反白屬性優先)");

        var rowE1 = p4.add("group");
        var bPing  = rowE1.add("button", undefined, "pingpong");  bPing.preferredSize.width = 80;
        var bCycle = rowE1.add("button", undefined, "cycle");     bCycle.preferredSize.width = 80;
        var bWig   = rowE1.add("button", undefined, "wiggle…");   bWig.preferredSize.width = 80;
        var bClear = rowE1.add("button", undefined, "清除");      bClear.preferredSize.width = 60;

        bPing.onClick  = function () { applyExprToSelection('loopOut("pingpong")', propDrop.selection.index, "套用 pingpong"); };
        bCycle.onClick = function () { applyExprToSelection('loopOut("cycle")',    propDrop.selection.index, "套用 cycle"); };
        bWig.onClick   = function () {
            var f = parseFloat(prompt("wiggle 頻率(每秒幾次):", "2"));  if (isNaN(f)) return;
            var a = parseFloat(prompt("wiggle 幅度:", "10"));            if (isNaN(a)) return;
            applyExprToSelection("wiggle(" + f + ", " + a + ")", propDrop.selection.index, "套用 wiggle");
        };
        bClear.onClick = function () { applyExprToSelection("", propDrop.selection.index, "清除表達式"); };

        var customBox = p4.add("edittext", undefined, "", { multiline: true });
        customBox.preferredSize.height = 64;
        var rowE2 = p4.add("group");
        var bCustom = rowE2.add("button", undefined, "套用自訂表達式"); bCustom.preferredSize.width = 140;
        bCustom.onClick = function () {
            var txt = customBox.text;
            if (!txt || txt.replace(/\s/g, "") === "") { alert("先在上面的框貼入表達式。"); return; }
            applyExprToSelection(txt, propDrop.selection.index, "套用自訂表達式");
        };

        // --- 常用表達式庫 ---
        p4.add("statictext", undefined, "我的常用表達式(點一下=載入上面的框,雙擊=直接套用):");
        var libItems = libLoad();
        var rowLib = p4.add("group"); rowLib.alignChildren = ["fill", "fill"];
        var libList = rowLib.add("listbox", undefined, []);
        libList.preferredSize = [170, 84];
        var libBtns = rowLib.add("group");
        libBtns.orientation = "column"; libBtns.alignChildren = ["fill", "top"];
        var bLibApply = libBtns.add("button", undefined, "套用");
        var bLibAdd   = libBtns.add("button", undefined, "+ 存入");
        var bLibDel   = libBtns.add("button", undefined, "− 刪除");

        function refreshLib() {
            libList.removeAll();
            for (var i = 0; i < libItems.length; i++) libList.add("item", libItems[i].name);
        }
        refreshLib();

        libList.onChange = function () {
            if (libList.selection) customBox.text = libItems[libList.selection.index].expr;
        };
        libList.onDoubleClick = function () {
            if (libList.selection)
                applyExprToSelection(libItems[libList.selection.index].expr, propDrop.selection.index, "套用常用表達式");
        };
        bLibApply.onClick = function () {
            if (!libList.selection) { alert("先在清單選一個表達式。"); return; }
            applyExprToSelection(libItems[libList.selection.index].expr, propDrop.selection.index, "套用常用表達式");
        };
        bLibAdd.onClick = function () {
            var txt = customBox.text;
            if (!txt || txt.replace(/\s/g, "") === "") { alert("先把表達式貼進上面的框,再按「存入」。"); return; }
            var nm = prompt("幫這個表達式取個名字:", "");
            if (!nm) return;
            libItems.push({ name: nm, expr: txt });
            libSave(libItems);
            refreshLib();
        };
        bLibDel.onClick = function () {
            if (!libList.selection) { alert("先在清單選一個要刪的。"); return; }
            libItems.splice(libList.selection.index, 1);
            libSave(libItems);
            refreshLib();
        };

        pal.layout.layout(true);
        updateScrollbars();
        pal.onResizing = pal.onResize = function () {
            this.layout.resize();
            updateScrollbars();
        };
        return pal;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) {
        ui.center(); ui.show();
        if (ui.__updateScroll) ui.__updateScroll();
    }

})(this);
