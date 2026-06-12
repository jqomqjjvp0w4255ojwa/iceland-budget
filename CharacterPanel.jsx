// CharacterPanel.jsx — 角色快速綁定/動態面板
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

    // ================= UI =================

    function buildUI(thisObj) {
        var pal = (thisObj instanceof Panel) ? thisObj
                : new Window("palette", "角色工具", undefined, { resizeable: true });

        pal.orientation = "column";
        pal.alignChildren = ["fill", "top"];
        pal.spacing = 6; pal.margins = 10;

        // --- 標記區 ---
        var p1 = pal.add("panel", undefined, "1. 標記(先選圖層再按)");
        p1.orientation = "column"; p1.alignChildren = ["fill", "top"]; p1.margins = 8;
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
        fullRigCheck = p1.add("checkbox", undefined, "完整綁定(建 face/eye/mouth/ear Null 並 parent)");
        fullRigCheck.value = false;

        // --- 動態區 ---
        var p2 = pal.add("panel", undefined, "2. 一鍵動態");
        p2.orientation = "column"; p2.alignChildren = ["fill", "top"]; p2.margins = 8;
        var rowC = p2.add("group"); var rowD = p2.add("group");
        var bBlink = rowC.add("button", undefined, "隨機眨眼");   bBlink.preferredSize.width = 110;
        var bTalk  = rowC.add("button", undefined, "說話設定");   bTalk.preferredSize.width = 110;
        var bBr    = rowD.add("button", undefined, "呼吸(選取)"); bBr.preferredSize.width = 110;
        var bFl    = rowD.add("button", undefined, "漂浮(選取)"); bFl.preferredSize.width = 110;
        bBlink.onClick = doBlink;
        bTalk.onClick  = doTalkSetup;
        bBr.onClick    = doBreath;
        bFl.onClick    = doFloat;

        // --- 演出區 ---
        var p3 = pal.add("panel", undefined, "3. 演出(停在目前時間打 key)");
        p3.orientation = "row"; p3.alignChildren = ["fill", "top"]; p3.margins = 8;
        var bOn  = p3.add("button", undefined, "▶ 開始說話"); bOn.preferredSize.width = 110;
        var bOff = p3.add("button", undefined, "■ 停止說話"); bOff.preferredSize.width = 110;
        bOn.onClick  = function () { setMouthKey(true); };
        bOff.onClick = function () { setMouthKey(false); };

        pal.layout.layout(true);
        pal.onResizing = pal.onResize = function () { this.layout.resize(); };
        return pal;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) { ui.center(); ui.show(); }

})(this);
