// sprites.js — 台灣版成員像素圖
// ══════════════════════════════════════════════════════════
//  結構與冰島版相同：每位成員一個 *_FRAMES 陣列（4 格待機動畫），
//  用 spritetool.html 綁定成員後，把生成的程式碼貼進來替換。
//  沒有對應 FRAMES 時，頁面會自動退回 config.js 的 emoji icon，
//  不會壞版（防呆）。
// ══════════════════════════════════════════════════════════

(function () {

  // ╔══════════════════════════════════╗
  // ║  🌸 花 － FLOWER_FRAMES 開始      ║
  // ║  更新方式：用 spritetool 生成後    ║
  // ║  替換下方 frame 字串               ║
  // ╚══════════════════════════════════╝
  const FLOWER_FRAMES = [
    // 尚未綁定：留空陣列即可，地圖會用 emoji 備援
  ]; // 🌸 花 FLOWER_FRAMES 結束

  // ╔══════════════════════════════════╗
  // ║  🙉 猴 － MONKEY_FRAMES 開始      ║
  // ╚══════════════════════════════════╝
  const MONKEY_FRAMES = [
  ]; // 🙉 猴 MONKEY_FRAMES 結束

  // ╔══════════════════════════════════╗
  // ║  🐱 寧 － NING_FRAMES 開始        ║
  // ╚══════════════════════════════════╝
  const NING_FRAMES = [
  ]; // 🐱 寧 NING_FRAMES 結束

  // ── 暴露到全域（供地圖頭像 / marker 使用）
  window.SPRITES = Object.assign(window.SPRITES || {}, {
    FLOWER_FRAMES,
    MONKEY_FRAMES,
    NING_FRAMES,
  });

})();
