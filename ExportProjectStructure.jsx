// ExportProjectStructure.jsx
// 在 AE 裡執行:File > Scripts > Run Script File...
// 會把整個專案的合成/圖層/父子/錨點/關鍵影格/表達式/效果
// 匯出成一個文字檔(存在專案檔旁邊,或讓你選位置)。

(function () {

    var out = [];

    function line(indent, text) {
        var pad = "";
        for (var i = 0; i < indent; i++) pad += "  ";
        out.push(pad + text);
    }

    function fmtVal(v) {
        if (v instanceof Array) {
            var parts = [];
            for (var i = 0; i < v.length; i++) {
                parts.push(Math.round(v[i] * 100) / 100);
            }
            return "[" + parts.join(", ") + "]";
        }
        if (typeof v === "number") return String(Math.round(v * 100) / 100);
        return String(v);
    }

    // 遞迴掃描屬性:列出有關鍵影格或表達式的屬性
    function scanProps(propGroup, indent, path) {
        for (var i = 1; i <= propGroup.numProperties; i++) {
            var prop;
            try { prop = propGroup.property(i); } catch (e) { continue; }
            if (!prop) continue;

            var p = path + " > " + prop.name;

            if (prop.propertyType === PropertyType.PROPERTY) {
                var hasKeys = false, hasExpr = false;
                try { hasKeys = (prop.numKeys > 0); } catch (e) {}
                try { hasExpr = (prop.expressionEnabled && prop.expression !== ""); } catch (e) {}

                if (hasKeys || hasExpr) {
                    line(indent, "* " + p);
                    if (hasKeys) {
                        var keyInfo = [];
                        var maxShow = Math.min(prop.numKeys, 8);
                        for (var k = 1; k <= maxShow; k++) {
                            try {
                                keyInfo.push("t=" + (Math.round(prop.keyTime(k) * 100) / 100) +
                                             " v=" + fmtVal(prop.keyValue(k)));
                            } catch (e) { keyInfo.push("t=" + (Math.round(prop.keyTime(k) * 100) / 100)); }
                        }
                        line(indent + 1, "keys(" + prop.numKeys + "): " + keyInfo.join(" | ") +
                             (prop.numKeys > maxShow ? " ..." : ""));
                    }
                    if (hasExpr) {
                        var expr = prop.expression.replace(/\r?\n/g, " \\n ");
                        if (expr.length > 300) expr = expr.substring(0, 300) + " ...(截斷)";
                        line(indent + 1, "expression: " + expr);
                    }
                }
            } else {
                // 群組(效果、遮罩、Puppet 等)往下繼續掃
                try { scanProps(prop, indent, p); } catch (e) {}
            }
        }
    }

    function describeLayer(layer, indent) {
        var type = "Layer";
        if (layer instanceof AVLayer) {
            if (layer.nullLayer) type = "Null";
            else if (layer.source instanceof CompItem) type = "PreComp(" + layer.source.name + ")";
            else if (layer.source && layer.source.mainSource instanceof SolidSource) type = "Solid";
            else type = "Footage";
        } else if (layer instanceof ShapeLayer) type = "Shape";
        else if (layer instanceof TextLayer) type = "Text";
        else if (layer instanceof CameraLayer) type = "Camera";
        else if (layer instanceof LightLayer) type = "Light";

        var flags = [];
        if (!layer.enabled) flags.push("隱藏");
        if (layer.locked) flags.push("鎖定");
        if (layer.shy) flags.push("shy");
        if (layer.adjustmentLayer) flags.push("調整圖層");

        line(indent, "[" + layer.index + "] " + layer.name + "  (" + type + ")" +
             (flags.length ? "  {" + flags.join(",") + "}" : ""));

        if (layer.parent) {
            line(indent + 1, "parent -> [" + layer.parent.index + "] " + layer.parent.name);
        }

        try {
            var ap = layer.property("ADBE Transform Group").property("ADBE Anchor Point");
            line(indent + 1, "anchor: " + fmtVal(ap.value));
        } catch (e) {}

        line(indent + 1, "in/out: " + (Math.round(layer.inPoint * 100) / 100) + "s ~ " +
             (Math.round(layer.outPoint * 100) / 100) + "s");

        // 效果列表
        try {
            var fx = layer.property("ADBE Effect Parade");
            if (fx && fx.numProperties > 0) {
                var fxNames = [];
                for (var f = 1; f <= fx.numProperties; f++) fxNames.push(fx.property(f).name);
                line(indent + 1, "effects: " + fxNames.join(", "));
            }
        } catch (e) {}

        // 有 key 或表達式的屬性
        scanProps(layer, indent + 1, "");
    }

    function run() {
        var proj = app.project;
        if (!proj || proj.numItems === 0) {
            alert("專案是空的,先開啟你的角色專案再跑一次。");
            return;
        }

        line(0, "=== AE 專案結構匯出 ===");
        line(0, "專案: " + (proj.file ? proj.file.fsName : "(尚未儲存)"));
        line(0, "匯出時間: " + new Date().toString());
        line(0, "");

        var compCount = 0;
        for (var i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (!(item instanceof CompItem)) continue;
            compCount++;

            line(0, "============================================");
            line(0, "COMP: " + item.name + "  (" + item.width + "x" + item.height +
                 ", " + (Math.round(item.duration * 100) / 100) + "s, " + item.frameRate + "fps)");
            var folder = item.parentFolder;
            if (folder && folder.name !== "Root") line(1, "資料夾: " + folder.name);

            for (var L = 1; L <= item.numLayers; L++) {
                try { describeLayer(item.layer(L), 1); } catch (e) {
                    line(1, "[" + L + "] (讀取失敗: " + e.toString() + ")");
                }
            }
            line(0, "");
        }

        if (compCount === 0) {
            alert("專案裡沒有合成(Composition)。");
            return;
        }

        // 存檔
        var defaultName = "project_structure.txt";
        var saveFile;
        if (proj.file) {
            saveFile = new File(proj.file.parent.fsName + "/" + defaultName);
        } else {
            saveFile = File.saveDialog("選擇匯出位置", "*.txt");
            if (!saveFile) return;
        }

        saveFile.encoding = "UTF-8";
        if (saveFile.open("w")) {
            saveFile.write(out.join("\n"));
            saveFile.close();
            alert("匯出完成!\n共 " + compCount + " 個合成\n\n檔案位置:\n" + saveFile.fsName);
        } else {
            alert("無法寫入檔案,請確認權限。");
        }
    }

    app.beginUndoGroup("Export Project Structure");
    try { run(); } finally { app.endUndoGroup(); }

})();
