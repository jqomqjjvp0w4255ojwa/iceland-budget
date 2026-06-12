// ApplyRandomBlink.jsx
// 批次套用「隨機眨眼」到專案中的角色合成。
//
// 支援兩種你的綁定方式:
//   A. control Null + eye Slider(0=睜眼, 1=閉眼)
//      → 在 eye Slider 上掛隨機眨眼表達式(保留既有手動 key,
//        表達式輸出 Math.max(value, blink),手動演出不受影響)
//   B. 沒有 control,但有名稱含「閉眼」的圖層
//      → 直接在該圖層 Opacity 上掛隨機眨眼;
//        同合成內表達式有引用「閉眼」的圖層(如 眼ball)會自動改成反向連動
//
// 每個合成會拿到一個獨一無二的隨機種子,所有角色眨眼時間絕不同步。
// 用法:File > Scripts > Run Script File...
//   先在專案面板選取要處理的合成;都不選的話會問你要不要掃整個專案。

(function () {

    // ---------- 小工具 ----------

    function findLayerByName(comp, name) {
        for (var i = 1; i <= comp.numLayers; i++) {
            if (comp.layer(i).name === name) return comp.layer(i);
        }
        return null;
    }

    function getEyeSlider(comp) {
        var ctrl = findLayerByName(comp, "control");
        if (!ctrl) return null;
        try {
            var fx = ctrl.property("ADBE Effect Parade");
            if (!fx) return null;
            var eyeFx = fx.property("eye");
            if (!eyeFx) return null;
            return eyeFx.property(1); // Slider
        } catch (e) { return null; }
    }

    function buildBlinkExpr(seed, minGap, maxGap, blinkFrames, asOpacity) {
        var lines = [
            "// === 隨機眨眼(腳本自動加入)===",
            "var minGap = " + minGap + ";   // 兩次眨眼最短間隔(秒)",
            "var maxGap = " + maxGap + ";   // 最長間隔(秒)",
            "var blinkDur = " + blinkFrames + " * thisComp.frameDuration; // 閉眼時長(格數)",
            "seedRandom(" + seed + ", true); // 每個合成種子不同,不會同步眨",
            "var t = 0, blink = 0;",
            "while (t < time) {",
            "  t += random(minGap, maxGap);",
            "  if (time >= t && time < t + blinkDur) { blink = 1; break; }",
            "  t += blinkDur;",
            "}",
            asOpacity ? "blink * 100" : "Math.max(value, blink) // 保留手動 key 的演出"
        ];
        return lines.join("\n");
    }

    // ---------- 主流程 ----------

    function run() {
        var proj = app.project;
        if (!proj) { alert("沒有開啟專案。"); return; }

        // 收集目標合成
        var targets = [];
        var sel = proj.selection;
        for (var i = 0; i < sel.length; i++) {
            if (sel[i] instanceof CompItem) targets.push(sel[i]);
        }
        if (targets.length === 0) {
            if (!confirm("專案面板沒有選取合成。\n要掃描整個專案、自動處理所有可眨眼的合成嗎?")) return;
            for (var j = 1; j <= proj.numItems; j++) {
                if (proj.item(j) instanceof CompItem) targets.push(proj.item(j));
            }
        }

        // 參數
        var minGap = parseFloat(prompt("兩次眨眼最短間隔(秒):", "2.5")); if (isNaN(minGap)) return;
        var maxGap = parseFloat(prompt("兩次眨眼最長間隔(秒):", "6"));   if (isNaN(maxGap)) return;
        var blinkFrames = parseInt(prompt("每次閉眼幾格(你目前約 7 格):", "7"), 10); if (isNaN(blinkFrames)) return;

        var doneA = [], doneB = [], skipped = [];
        var usedSeeds = {};

        function uniqueSeed() {
            var s;
            do { s = Math.floor(Math.random() * 900000) + 1000; } while (usedSeeds[s]);
            usedSeeds[s] = true;
            return s;
        }

        for (var c = 0; c < targets.length; c++) {
            var comp = targets[c];

            // 方式 A:control + eye Slider
            var slider = getEyeSlider(comp);
            if (slider) {
                slider.expression = buildBlinkExpr(uniqueSeed(), minGap, maxGap, blinkFrames, false);
                doneA.push(comp.name);
                continue;
            }

            // 方式 B:找「閉眼」圖層
            var closedLayers = [];
            for (var L = 1; L <= comp.numLayers; L++) {
                if (comp.layer(L).name.indexOf("閉眼") !== -1) closedLayers.push(comp.layer(L));
            }
            if (closedLayers.length === 0) { skipped.push(comp.name); continue; }

            var seed = uniqueSeed();
            for (var k = 0; k < closedLayers.length; k++) {
                var lay = closedLayers[k];
                try {
                    lay.property("ADBE Transform Group").property("ADBE Opacity").expression =
                        buildBlinkExpr(seed, minGap, maxGap, blinkFrames, true);
                } catch (e) {}
            }
            // 同合成內,表達式有引用「閉眼」的圖層 → 改成反向連動
            var firstClosed = closedLayers[0].name;
            for (var L2 = 1; L2 <= comp.numLayers; L2++) {
                var lay2 = comp.layer(L2);
                if (lay2.name.indexOf("閉眼") !== -1) continue;
                try {
                    var op = lay2.property("ADBE Transform Group").property("ADBE Opacity");
                    if (op.expressionEnabled && op.expression.indexOf("閉眼") !== -1) {
                        op.expression = '100 - thisComp.layer("' + firstClosed + '").transform.opacity';
                    }
                } catch (e) {}
            }
            doneB.push(comp.name);
        }

        var msg = "完成!\n";
        if (doneA.length) msg += "\n[control 綁定] 已套用 " + doneA.length + " 個合成:\n  " + doneA.join("、");
        if (doneB.length) msg += "\n\n[閉眼圖層] 已套用 " + doneB.length + " 個合成:\n  " + doneB.join("、");
        if (skipped.length) msg += "\n\n找不到眨眼結構、已跳過 " + skipped.length + " 個:\n  " + skipped.join("、");
        alert(msg);
    }

    app.beginUndoGroup("Apply Random Blink");
    try { run(); } finally { app.endUndoGroup(); }

})();
