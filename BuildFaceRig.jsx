// BuildFaceRig.jsx
// 在「目前開啟的合成」一鍵建立你的標準臉部綁定:
//
//   control (Null) ── Slider: eye / mouth / 眉 / emo + Point: face position
//   face (Null) ←─ 位置跟隨 face position
//   ├─ eye (Null)、mouth (Null)
//   ear (Null) ←─ 跟著臉反向偏移(X 同向、Y 反向)
//
// 然後依圖層名稱自動 parent + 掛切換表達式:
//   含「耳」        → parent 到 ear
//   含「眼/眉/睫」  → parent 到 eye
//   含「嘴/口」     → parent 到 mouth
//   含「鼻/臉頰/腮」→ parent 到 face
//
//   閉眼            → eye==1     開眼/睜眼/眼  → eye==0
//   閉嘴→mouth==0   張嘴/開嘴→1  張嘴 2/開嘴 2→2  閉嘴 2→3
//   眉/眉毛→0       眉 2→1       眉毛 3→2
//   汗              → emo==1
//
// 已有 parent 的圖層不會動它;已存在的 control 會沿用、只補缺的滑桿。
// 用法:打開角色的頭部合成 → File > Scripts > Run Script File...

(function () {

    function findLayerByName(comp, name) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) return comp.layer(i);
        }
        return null;
    }

    function ensureSlider(ctrl, name) {
        var fx = ctrl.property("ADBE Effect Parade");
        if (fx.property(name)) return fx.property(name);
        var s = fx.addProperty("ADBE Slider Control");
        s.name = name;
        return s;
    }

    function ensurePoint(ctrl, name, defVal) {
        var fx = ctrl.property("ADBE Effect Parade");
        if (fx.property(name)) return fx.property(name);
        var p = fx.addProperty("ADBE Point Control");
        p.name = name;
        p.property(1).setValue(defVal);
        return p;
    }

    function ensureNull(comp, name) {
        var existing = findLayerByName(comp, name);
        if (existing) return existing;
        var n = comp.layers.addNull(comp.duration);
        n.name = name;
        return n;
    }

    function switchExpr(sliderName, val) {
        return 'sliderValue = thisComp.layer("control").effect("' + sliderName + '")("Slider")\n\n' +
               '// 設置透明度\nsliderValue == ' + val + '? 100 : 0\n';
    }

    // 名稱結尾的數字(「眉毛 2」→2,「眉毛」→null)
    function trailingNum(name) {
        var m = name.match(/(\d+)\s*$/);
        return m ? parseInt(m[1], 10) : null;
    }

    function run() {
        var comp = app.project.activeItem;
        if (!(comp instanceof CompItem)) { alert("請先打開要綁定的合成(時間軸要是作用中的)。"); return; }

        var report = [];

        // 1. control + 滑桿
        var ctrl = findLayerByName(comp, "control");
        if (!ctrl) {
            ctrl = comp.layers.addNull(comp.duration);
            ctrl.name = "control";
            ctrl.moveToBeginning();
            report.push("建立 control Null");
        } else {
            report.push("沿用既有 control");
        }
        ensureSlider(ctrl, "eye");
        ensureSlider(ctrl, "mouth");
        ensureSlider(ctrl, "眉");
        ensureSlider(ctrl, "emo");
        var centerPos = [comp.width / 2, comp.height / 2];
        ensurePoint(ctrl, "face position", centerPos);

        // 2. 結構 Null
        var faceN  = ensureNull(comp, "face");
        var eyeN   = ensureNull(comp, "eye");
        var mouthN = ensureNull(comp, "mouth");
        var earN   = ensureNull(comp, "ear");

        faceN.property("ADBE Transform Group").property("ADBE Position").expression =
            'thisComp.layer("control").effect("face position")("Point")';
        if (!eyeN.parent)   eyeN.parent   = faceN;
        if (!mouthN.parent) mouthN.parent = faceN;

        // ear:以建立當下的位置為基準,X 同向、Y 反向跟著臉動
        var initFace = ctrl.property("ADBE Effect Parade").property("face position").property(1).value;
        var initEar  = earN.property("ADBE Transform Group").property("ADBE Position").value;
        earN.property("ADBE Transform Group").property("ADBE Position").expression = [
            '// 臉部控制點',
            'facePos = thisComp.layer("control").effect("face position")("Point");',
            'initFacePos = [' + initFace[0] + ', ' + initFace[1] + '];',
            'initEarPos = [' + initEar[0] + ', ' + initEar[1] + '];',
            'delta = facePos - initFacePos;',
            '// X 同方向、Y 反方向',
            'initEarPos + [delta[0], -delta[1]]'
        ].join("\n");

        // 3. 自動 parent + 切換表達式
        var structural = { "control": 1, "face": 1, "eye": 1, "mouth": 1, "ear": 1 };
        var parented = 0, exprCount = 0, unsure = [];

        for (var i = 1; i <= comp.numLayers; i++) {
            var lay = comp.layer(i);
            var nm = lay.name;
            if (structural[nm]) continue;

            // ---- parent ----
            if (!lay.parent) {
                var target = null;
                if (nm.indexOf("耳") !== -1) target = earN;
                else if (nm.indexOf("眼") !== -1 || nm.indexOf("眉") !== -1 || nm.indexOf("睫") !== -1) target = eyeN;
                else if (nm.indexOf("嘴") !== -1 || nm.indexOf("口") !== -1) target = mouthN;
                else if (nm.indexOf("鼻") !== -1 || nm.indexOf("臉頰") !== -1 || nm.indexOf("腮") !== -1) target = faceN;
                if (target && lay !== target) {
                    try { lay.parent = target; parented++; } catch (e) {}
                }
            }

            // ---- 切換表達式 ----
            var sliderName = null, val = null;
            var n = trailingNum(nm);

            if (nm.indexOf("閉眼") !== -1) { sliderName = "eye"; val = 1; }
            else if (nm.indexOf("開眼") !== -1 || nm.indexOf("睜眼") !== -1) { sliderName = "eye"; val = 0; }
            else if (nm.indexOf("閉嘴") !== -1) { sliderName = "mouth"; val = (n !== null && n >= 2) ? 3 : 0; }
            else if (nm.indexOf("張嘴") !== -1 || nm.indexOf("開嘴") !== -1) { sliderName = "mouth"; val = (n !== null && n >= 2) ? 2 : 1; }
            else if (nm.indexOf("眉") !== -1) { sliderName = "眉"; val = (n === null) ? 0 : n - 1; }
            else if (nm.indexOf("汗") !== -1) { sliderName = "emo"; val = 1; }
            else if (nm.indexOf("眼") !== -1) {
                // 純「眼/眼1」當睜眼;「眼3」之類交給你確認,先列出來不亂掛
                if (n === null || n <= 1) { sliderName = "eye"; val = 0; }
                else unsure.push(nm);
            }

            if (sliderName !== null) {
                try {
                    lay.property("ADBE Transform Group").property("ADBE Opacity").expression =
                        switchExpr(sliderName, val);
                    exprCount++;
                } catch (e) {}
            }
        }

        var msg = "綁定完成!\n" + report.join("\n") +
                  "\n已 parent " + parented + " 個圖層、掛上 " + exprCount + " 個切換表達式。";
        if (unsure.length) msg += "\n\n這些圖層我不確定對應哪個滑桿值,沒有動它們:\n  " + unsure.join("、");
        msg += "\n\n之後動畫就照你的習慣:在 control 的滑桿上打 key 即可。";
        alert(msg);
    }

    app.beginUndoGroup("Build Face Rig");
    try { run(); } finally { app.endUndoGroup(); }

})();
