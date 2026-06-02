// ╔══════════════════════════════════════════╗
// ║  sprites.js － 角色、車輛、背景資料       ║
// ║  花🌸 / 猴🙉 / 寧🐱 / RAV4 🚙           ║
// ║  更新角色：用 sprite-converter.html 轉換  ║
// ╚══════════════════════════════════════════╝

// ── 背景 SVG 內容（注入到 #pxBgSvg）
// ╔══════════════════════╗
// ║  BACKGROUND 開始     ║
// ╚══════════════════════╝
const BG_SVG_CONTENT = `<!-- 雲 -->
          <g fill="#fff">
            <rect x="56"  y="18" width="44" height="10"/><rect x="60"  y="14" width="28" height="6"/><rect x="68"  y="12" width="14" height="4"/>
            <rect x="246" y="12" width="58" height="10"/><rect x="254" y="8"  width="34" height="6"/><rect x="264" y="6"  width="16" height="4"/>
            <rect x="496" y="20" width="46" height="9"/> <rect x="504" y="16" width="24" height="6"/>
            <rect x="427" y="8"  width="32" height="7"/> <rect x="433" y="5"  width="18" height="4"/>
            <rect x="147" y="28" width="28" height="7"/> <rect x="151" y="25" width="16" height="4"/>
          </g>
          <!-- 遠山 -->
          <polygon points="0,100 20,80 40,90 60,68 90,82 115,58 140,74 170,50 200,68 230,44 255,62 280,46 310,64 340,38 370,58 400,42 430,62 460,40 490,62 520,46 550,65 580,44 610,66 640,48 660,62 680,50 680,100 0,100" fill="#4a7c4e"/>
          <!-- 雪帽 -->
          <rect x="336" y="38" width="8"  height="4" fill="#f0f4ff"/><rect x="332" y="42" width="16" height="4" fill="#f0f4ff"/><rect x="330" y="46" width="20" height="3" fill="#e8f0ff" opacity="0.8"/>
          <rect x="227" y="44" width="6"  height="4" fill="#f0f4ff"/><rect x="224" y="48" width="12" height="3" fill="#f0f4ff"/>
          <rect x="457" y="40" width="6"  height="4" fill="#f0f4ff"/><rect x="454" y="44" width="12" height="3" fill="#f0f4ff"/>
          <rect x="112" y="58" width="6"  height="3" fill="#f0f4ff"/>
          <rect x="577" y="44" width="6"  height="3" fill="#f0f4ff"/>
          <!-- 中山 -->
          <polygon points="0,108 30,90 60,100 90,78 120,94 150,72 180,88 210,64 240,82 268,60 295,78 322,58 350,76 378,56 405,74 432,58 460,76 488,62 515,80 542,64 568,80 594,62 620,78 648,62 668,76 680,58 680,100 0,100" fill="#2d5638"/>
          <!-- 湖 -->
          <rect x="0" y="100" width="680" height="10" fill="#7ec8e8"/>
          <rect x="0" y="102" width="680" height="4"  fill="#9ad8f0" opacity="0.45"/>
          <g fill="#c8f0ff" opacity="0.5">
            <rect x="70"  y="102" width="30" height="2"/><rect x="200" y="103" width="22" height="1"/>
            <rect x="370" y="102" width="38" height="2"/><rect x="520" y="103" width="28" height="1"/>
          </g>
          <!-- 草地上層 -->
          <rect x="0" y="108" width="680" height="8" fill="#78c850"/>
          <g fill="#98e060">
            <rect x="0" y="106" width="2" height="3"/><rect x="6" y="105" width="2" height="4"/><rect x="14" y="106" width="2" height="3"/><rect x="20" y="105" width="2" height="4"/><rect x="28" y="106" width="2" height="3"/><rect x="34" y="105" width="2" height="4"/><rect x="42" y="106" width="2" height="3"/><rect x="48" y="105" width="2" height="4"/><rect x="56" y="106" width="2" height="3"/><rect x="62" y="105" width="2" height="4"/><rect x="70" y="106" width="2" height="3"/><rect x="76" y="105" width="2" height="4"/><rect x="84" y="106" width="2" height="3"/><rect x="90" y="105" width="2" height="4"/><rect x="98" y="106" width="2" height="3"/><rect x="104" y="105" width="2" height="4"/><rect x="112" y="106" width="2" height="3"/><rect x="118" y="105" width="2" height="4"/><rect x="126" y="106" width="2" height="3"/><rect x="132" y="105" width="2" height="4"/><rect x="140" y="106" width="2" height="3"/><rect x="146" y="105" width="2" height="4"/><rect x="154" y="106" width="2" height="3"/><rect x="160" y="105" width="2" height="4"/><rect x="168" y="106" width="2" height="3"/><rect x="174" y="105" width="2" height="4"/><rect x="182" y="106" width="2" height="3"/><rect x="188" y="105" width="2" height="4"/><rect x="196" y="106" width="2" height="3"/><rect x="202" y="105" width="2" height="4"/><rect x="210" y="106" width="2" height="3"/><rect x="216" y="105" width="2" height="4"/><rect x="224" y="106" width="2" height="3"/><rect x="230" y="105" width="2" height="4"/><rect x="238" y="106" width="2" height="3"/><rect x="244" y="105" width="2" height="4"/><rect x="252" y="106" width="2" height="3"/><rect x="258" y="105" width="2" height="4"/><rect x="266" y="106" width="2" height="3"/><rect x="272" y="105" width="2" height="4"/><rect x="280" y="106" width="2" height="3"/><rect x="286" y="105" width="2" height="4"/><rect x="294" y="106" width="2" height="3"/><rect x="300" y="105" width="2" height="4"/><rect x="308" y="106" width="2" height="3"/><rect x="314" y="105" width="2" height="4"/><rect x="322" y="106" width="2" height="3"/><rect x="328" y="105" width="2" height="4"/><rect x="336" y="106" width="2" height="3"/><rect x="342" y="105" width="2" height="4"/><rect x="350" y="106" width="2" height="3"/><rect x="356" y="105" width="2" height="4"/><rect x="364" y="106" width="2" height="3"/><rect x="370" y="105" width="2" height="4"/><rect x="378" y="106" width="2" height="3"/><rect x="384" y="105" width="2" height="4"/><rect x="392" y="106" width="2" height="3"/><rect x="398" y="105" width="2" height="4"/><rect x="406" y="106" width="2" height="3"/><rect x="412" y="105" width="2" height="4"/><rect x="420" y="106" width="2" height="3"/><rect x="426" y="105" width="2" height="4"/><rect x="434" y="106" width="2" height="3"/><rect x="440" y="105" width="2" height="4"/><rect x="448" y="106" width="2" height="3"/><rect x="454" y="105" width="2" height="4"/><rect x="462" y="106" width="2" height="3"/><rect x="468" y="105" width="2" height="4"/><rect x="476" y="106" width="2" height="3"/><rect x="482" y="105" width="2" height="4"/><rect x="490" y="106" width="2" height="3"/><rect x="496" y="105" width="2" height="4"/><rect x="504" y="106" width="2" height="3"/><rect x="510" y="105" width="2" height="4"/><rect x="518" y="106" width="2" height="3"/><rect x="524" y="105" width="2" height="4"/><rect x="532" y="106" width="2" height="3"/><rect x="538" y="105" width="2" height="4"/><rect x="546" y="106" width="2" height="3"/><rect x="552" y="105" width="2" height="4"/><rect x="560" y="106" width="2" height="3"/><rect x="566" y="105" width="2" height="4"/><rect x="574" y="106" width="2" height="3"/><rect x="580" y="105" width="2" height="4"/><rect x="588" y="106" width="2" height="3"/><rect x="594" y="105" width="2" height="4"/><rect x="602" y="106" width="2" height="3"/><rect x="608" y="105" width="2" height="4"/><rect x="616" y="106" width="2" height="3"/><rect x="622" y="105" width="2" height="4"/><rect x="630" y="106" width="2" height="3"/><rect x="636" y="105" width="2" height="4"/><rect x="644" y="106" width="2" height="3"/><rect x="650" y="105" width="2" height="4"/><rect x="658" y="106" width="2" height="3"/><rect x="664" y="105" width="2" height="4"/><rect x="672" y="106" width="2" height="3"/><rect x="678" y="105" width="2" height="4"/>
          </g>
          <rect x="0" y="115" width="680" height="5" fill="#58a838"/>
          <!-- 公路 -->
          <rect x="0" y="120" width="680" height="30" fill="#646464"/>
          <rect x="0" y="120" width="680" height="2"  fill="#767676"/>
          <rect x="0" y="148" width="680" height="2"  fill="#484848"/>
          <rect x="0" y="122" width="680" height="1"  fill="#e0e0e0" opacity="0.3"/>
          <rect x="0" y="147" width="680" height="1"  fill="#e0e0e0" opacity="0.3"/>
          <!-- 中央虛線 -->
          <g fill="#f0e040">
            <rect x="0"   y="134" width="28" height="3"/><rect x="46"  y="134" width="28" height="3"/>
            <rect x="92"  y="134" width="28" height="3"/><rect x="138" y="134" width="28" height="3"/>
            <rect x="184" y="134" width="28" height="3"/><rect x="230" y="134" width="28" height="3"/>
            <rect x="276" y="134" width="28" height="3"/><rect x="322" y="134" width="28" height="3"/>
            <rect x="368" y="134" width="28" height="3"/><rect x="414" y="134" width="28" height="3"/>
            <rect x="460" y="134" width="28" height="3"/><rect x="506" y="134" width="28" height="3"/>
            <rect x="552" y="134" width="28" height="3"/><rect x="598" y="134" width="28" height="3"/>
            <rect x="644" y="134" width="28" height="3"/>
          </g>`;
// ║  BACKGROUND 結束     ║

// ── 注入背景
(function injectBackground() {
  function doInject() {
    var el = document.getElementById('pxBgSvg');
    if (el) { el.innerHTML = BG_SVG_CONTENT; return true; }
    return false;
  }
  if (!doInject()) {
    document.addEventListener('DOMContentLoaded', doInject);
  }
})();

// ╔══════════════════════════════════════════╗
// ║  🚙 RAV4 － CAR_FRAME（靜態，1格）       ║
// ║  畫布 32×20px，車頭朝右                  ║
// ║  更新方式：替換下方字串                   ║
// ╚══════════════════════════════════════════╝
const CAR_FRAME = `<rect x="5" y="5" width="1" height="1" fill="#413b3d"/><rect x="6" y="5" width="14" height="1" fill="#fefdf9"/><rect x="20" y="5" width="1" height="1" fill="#413b3d"/><rect x="4" y="6" width="1" height="1" fill="#413b3d"/><rect x="6" y="6" width="4" height="1" fill="#d9e8f0"/><rect x="11" y="6" width="8" height="1" fill="#fefdf9"/><rect x="20" y="6" width="1" height="1" fill="#413b3d"/><rect x="3" y="7" width="1" height="1" fill="#413b3d"/><rect x="4" y="7" width="1" height="1" fill="#8b7c7e"/><rect x="6" y="7" width="4" height="1" fill="#6b8fa0"/><rect x="11" y="7" width="7" height="1" fill="#8b8b8b"/><rect x="18" y="7" width="1" height="1" fill="#8b7c7e"/><rect x="21" y="7" width="1" height="1" fill="#413b3d"/><rect x="3" y="8" width="1" height="1" fill="#8b7c7e"/><rect x="4" y="8" width="1" height="1" fill="#5a5a5a"/><rect x="5" y="8" width="1" height="1" fill="#6b8fa0"/><rect x="6" y="8" width="1" height="1" fill="#2a1a1a"/><rect x="7" y="8" width="4" height="1" fill="#5a5a5a"/><rect x="11" y="8" width="7" height="1" fill="#5a5a5a"/><rect x="18" y="8" width="1" height="1" fill="#2a1a1a"/><rect x="19" y="8" width="1" height="1" fill="#6b8fa0"/><rect x="21" y="8" width="1" height="1" fill="#8b7c7e"/><rect x="3" y="9" width="1" height="1" fill="#8b7c7e"/><rect x="4" y="9" width="16" height="1" fill="#5a5a5a"/><rect x="21" y="9" width="1" height="1" fill="#8b7c7e"/><rect x="3" y="10" width="1" height="1" fill="#8b7c7e"/><rect x="4" y="10" width="16" height="1" fill="#6b6b6b"/><rect x="21" y="10" width="1" height="1" fill="#8b7c7e"/><rect x="3" y="11" width="1" height="1" fill="#8b7c7e"/><rect x="4" y="11" width="1" height="1" fill="#5a5a5a"/><rect x="5" y="11" width="2" height="1" fill="#3a3a3a"/><rect x="7" y="11" width="1" height="1" fill="#5a5a5a"/><rect x="8" y="11" width="1" height="1" fill="#3a3a3a"/><rect x="9" y="11" width="1" height="1" fill="#5a5a5a"/><rect x="10" y="11" width="9" height="1" fill="#3a3a3a"/><rect x="19" y="11" width="1" height="1" fill="#5a5a5a"/><rect x="21" y="11" width="1" height="1" fill="#8b7c7e"/><rect x="2" y="12" width="1" height="1" fill="#000"/><rect x="3" y="12" width="18" height="1" fill="#5a5a5a"/><rect x="22" y="12" width="1" height="1" fill="#000"/><rect x="2" y="13" width="1" height="1" fill="#3a2a2a"/><rect x="3" y="13" width="1" height="1" fill="#5a5a5a"/><rect x="4" y="13" width="16" height="1" fill="#7a7a7a"/><rect x="21" y="13" width="1" height="1" fill="#5a5a5a"/><rect x="22" y="13" width="1" height="1" fill="#3a2a2a"/><rect x="2" y="14" width="1" height="1" fill="#000"/><rect x="3" y="14" width="18" height="1" fill="#5a5a5a"/><rect x="22" y="14" width="1" height="1" fill="#000"/><rect x="3" y="15" width="1" height="1" fill="#5a5a5a"/><rect x="4" y="15" width="16" height="1" fill="#8b8b8b"/><rect x="21" y="15" width="1" height="1" fill="#5a5a5a"/><rect x="3" y="16" width="18" height="1" fill="#5a5a5a"/>`;
// ║  🚙 RAV4 CAR_FRAME 結束                  ║

// ── 注入車子到場景
(function injectCar() {
  function doInject() {
    var el = document.getElementById('pxCar');
    if (el) { el.innerHTML = CAR_FRAME; return true; }
    return false;
  }
  if (!doInject()) {
    document.addEventListener('DOMContentLoaded', doInject);
  }
})();

// ╔══════════════════════════════════╗
  // ║  🌸 花 － FLOWER_FRAMES 開始      ║
  // ║  更新方式：替換下方四個 frame 字串  ║
  // ╚══════════════════════════════════╝
  const FLOWER_FRAMES = [
    `<rect x="5" y="6" width="6" height="1" fill="#feae34"/><rect x="3" y="7" width="10" height="1" fill="#feae34"/><rect x="2" y="8" width="12" height="1" fill="#feae34"/><rect x="1" y="9" width="4" height="1" fill="#feae34"/><rect x="6" y="9" width="4" height="1" fill="#feae34"/><rect x="11" y="9" width="4" height="1" fill="#feae34"/><rect x="1" y="10" width="14" height="1" fill="#feae34"/><rect x="2" y="11" width="12" height="1" fill="#feae34"/><rect x="3" y="12" width="10" height="1" fill="#feae34"/><rect x="5" y="13" width="6" height="1" fill="#feae34"/><rect x="7" y="14" width="2" height="1" fill="#228b22"/>`,
    `<rect x="5" y="7" width="6" height="1" fill="#feae34"/><rect x="3" y="8" width="10" height="1" fill="#feae34"/><rect x="2" y="9" width="12" height="1" fill="#feae34"/><rect x="1" y="10" width="4" height="1" fill="#feae34"/><rect x="6" y="10" width="4" height="1" fill="#feae34"/><rect x="11" y="10" width="4" height="1" fill="#feae34"/><rect x="1" y="11" width="14" height="1" fill="#feae34"/><rect x="2" y="12" width="12" height="1" fill="#feae34"/><rect x="3" y="13" width="10" height="1" fill="#feae34"/><rect x="5" y="14" width="6" height="1" fill="#feae34"/><rect x="7" y="15" width="2" height="1" fill="#228b22"/>`,
    `<rect x="5" y="6" width="6" height="1" fill="#feae34"/><rect x="3" y="7" width="10" height="1" fill="#feae34"/><rect x="2" y="8" width="12" height="1" fill="#feae34"/><rect x="1" y="9" width="4" height="1" fill="#feae34"/><rect x="6" y="9" width="4" height="1" fill="#feae34"/><rect x="11" y="9" width="4" height="1" fill="#feae34"/><rect x="1" y="10" width="14" height="1" fill="#feae34"/><rect x="2" y="11" width="12" height="1" fill="#feae34"/><rect x="3" y="12" width="10" height="1" fill="#feae34"/><rect x="5" y="13" width="6" height="1" fill="#feae34"/><rect x="7" y="14" width="2" height="1" fill="#228b22"/>`,
    `<rect x="5" y="7" width="6" height="1" fill="#feae34"/><rect x="3" y="8" width="10" height="1" fill="#feae34"/><rect x="2" y="9" width="12" height="1" fill="#feae34"/><rect x="1" y="10" width="4" height="1" fill="#feae34"/><rect x="6" y="10" width="4" height="1" fill="#feae34"/><rect x="11" y="10" width="4" height="1" fill="#feae34"/><rect x="1" y="11" width="14" height="1" fill="#feae34"/><rect x="2" y="12" width="12" height="1" fill="#feae34"/><rect x="3" y="13" width="10" height="1" fill="#feae34"/><rect x="5" y="14" width="6" height="1" fill="#feae34"/><rect x="7" y="15" width="2" height="1" fill="#228b22"/>`
  ]; // 🌸 花 FLOWER_FRAMES 結束

// ╔══════════════════════════════════╗
  // ║  🙉 猴 － MONKEY_FRAMES 開始      ║
  // ║  更新方式：替換下方四個 frame 字串  ║
  // ╚══════════════════════════════════╝
  const MONKEY_FRAMES = [
    `<rect x="5" y="7" width="6" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="3" y="10" width="2" height="1" fill="#b86f50"/><rect x="6" y="10" width="4" height="1" fill="#b86f50"/><rect x="11" y="10" width="2" height="1" fill="#b86f50"/><rect x="3" y="11" width="10" height="1" fill="#b86f50"/><rect x="4" y="12" width="8" height="1" fill="#b86f50"/><rect x="5" y="13" width="6" height="1" fill="#b86f50"/><rect x="7" y="14" width="2" height="1" fill="#8b5a3c"/>`,
    `<rect x="6" y="7" width="4" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="3" y="10" width="10" height="1" fill="#b86f50"/><rect x="3" y="11" width="10" height="1" fill="#b86f50"/><rect x="4" y="12" width="8" height="1" fill="#b86f50"/><rect x="5" y="13" width="6" height="1" fill="#b86f50"/><rect x="7" y="14" width="2" height="1" fill="#8b5a3c"/>`,
    `<rect x="5" y="7" width="6" height="1" fill="#b86f50"/><rect x="4" y="8" width="8" height="1" fill="#b86f50"/><rect x="3" y="9" width="10" height="1" fill="#b86f50"/><rect x="3" y="10" width="2" height="1" fill="#b86f50"/><rect x="6" y="10" width="4" height="1" fill="#b86f50"/><rect x="11" y="10" width="2" height="1" fill="#b86f50"/><rect x="3" y="11" width="10" height="1" fill="#b86f50"/><rect x="4" y="12" width="8" height="1" fill="#b86f50"/><rect x="5" y="13" width="6" height="1" fill="#b86f50"/><rect x="7" y="14" width="2" height="1" fill="#8b5a3c"/>`,
    `<rect x="6" y="6" width="4" height="1" fill="#b86f50"/><rect x="4" y="7" width="8" height="1" fill="#b86f50"/><rect x="3" y="8" width="10" height="1" fill="#b86f50"/><rect x="3" y="9" width="2" height="1" fill="#b86f50"/><rect x="6" y="9" width="4" height="1" fill="#b86f50"/><rect x="11" y="9" width="2" height="1" fill="#b86f50"/><rect x="3" y="10" width="10" height="1" fill="#b86f50"/><rect x="4" y="11" width="8" height="1" fill="#b86f50"/><rect x="5" y="12" width="6" height="1" fill="#b86f50"/><rect x="7" y="13" width="2" height="1" fill="#8b5a3c"/>`
  ]; // 🙉 猴 MONKEY_FRAMES 結束

// ╔══════════════════════════════════╗
  // ║  🐱 寧 － NING_FRAMES 開始        ║
  // ║  更新方式：替換下方四個 frame 字串  ║
  // ╚══════════════════════════════════╝
  const NING_FRAMES = [
    `<rect x="3" y="4" width="1" height="1" fill="#434659"/><rect x="12" y="4" width="1" height="1" fill="#444559"/><rect x="3" y="5" width="1" height="1" fill="#41425e"/><rect x="4" y="5" width="8" height="1" fill="#5a6270"/><rect x="12" y="5" width="1" height="1" fill="#41425e"/><rect x="3" y="6" width="1" height="1" fill="#41425e"/><rect x="4" y="6" width="8" height="1" fill="#3a4857"/><rect x="12" y="6" width="1" height="1" fill="#41425e"/><rect x="3" y="7" width="1" height="1" fill="#41405b"/><rect x="4" y="7" width="8" height="1" fill="#4a5a68"/><rect x="12" y="7" width="1" height="1" fill="#41405b"/><rect x="3" y="8" width="1" height="1" fill="#41405b"/><rect x="4" y="8" width="8" height="1" fill="#5a7080"/><rect x="12" y="8" width="1" height="1" fill="#41405b"/><rect x="3" y="9" width="1" height="1" fill="#41405b"/><rect x="4" y="9" width="8" height="1" fill="#8a8a92"/><rect x="12" y="9" width="1" height="1" fill="#41405b"/><rect x="3" y="10" width="10" height="1" fill="#5a6a78"/><rect x="4" y="11" width="8" height="1" fill="#7a8a98"/>`,
    `<rect x="3" y="5" width="1" height="1" fill="#47455a"/><rect x="12" y="5" width="1" height="1" fill="#47455a"/><rect x="3" y="6" width="1" height="1" fill="#41415b"/><rect x="4" y="6" width="8" height="1" fill="#5a6270"/><rect x="12" y="6" width="1" height="1" fill="#41415b"/><rect x="3" y="7" width="1" height="1" fill="#41415b"/><rect x="4" y="7" width="8" height="1" fill="#4a5a68"/><rect x="12" y="7" width="1" height="1" fill="#41415b"/><rect x="3" y="8" width="1" height="1" fill="#41415b"/><rect x="4" y="8" width="8" height="1" fill="#5a7080"/><rect x="12" y="8" width="1" height="1" fill="#41415b"/><rect x="3" y="9" width="1" height="1" fill="#41415b"/><rect x="4" y="9" width="8" height="1" fill="#8a8a92"/><rect x="12" y="9" width="1" height="1" fill="#41415b"/><rect x="3" y="10" width="10" height="1" fill="#5a6a78"/><rect x="4" y="11" width="8" height="1" fill="#7a8a98"/>`,
    `<rect x="3" y="4" width="1" height="1" fill="#434659"/><rect x="12" y="4" width="1" height="1" fill="#444559"/><rect x="3" y="5" width="1" height="1" fill="#41425e"/><rect x="4" y="5" width="8" height="1" fill="#5a6270"/><rect x="12" y="5" width="1" height="1" fill="#41425e"/><rect x="3" y="6" width="1" height="1" fill="#41425e"/><rect x="4" y="6" width="8" height="1" fill="#3a4857"/><rect x="12" y="6" width="1" height="1" fill="#41425e"/><rect x="3" y="7" width="1" height="1" fill="#41405b"/><rect x="4" y="7" width="8" height="1" fill="#4a5a68"/><rect x="12" y="7" width="1" height="1" fill="#41405b"/><rect x="3" y="8" width="1" height="1" fill="#41405b"/><rect x="4" y="8" width="8" height="1" fill="#5a7080"/><rect x="12" y="8" width="1" height="1" fill="#41405b"/><rect x="3" y="9" width="1" height="1" fill="#41405b"/><rect x="4" y="9" width="8" height="1" fill="#8a8a92"/><rect x="12" y="9" width="1" height="1" fill="#41405b"/><rect x="3" y="10" width="10" height="1" fill="#5a6a78"/><rect x="4" y="11" width="8" height="1" fill="#7a8a98"/>`,
    `<rect x="3" y="3" width="1" height="1" fill="#4b4b57"/><rect x="12" y="3" width="1" height="1" fill="#4b4b57"/><rect x="3" y="4" width="1" height="1" fill="#404156"/><rect x="4" y="4" width="8" height="1" fill="#5a6270"/><rect x="12" y="4" width="1" height="1" fill="#404156"/><rect x="3" y="5" width="1" height="1" fill="#404156"/><rect x="4" y="5" width="8" height="1" fill="#3a4857"/><rect x="12" y="5" width="1" height="1" fill="#404156"/><rect x="3" y="6" width="1" height="1" fill="#404156"/><rect x="4" y="6" width="8" height="1" fill="#4a5a68"/><rect x="12" y="6" width="1" height="1" fill="#404156"/><rect x="3" y="7" width="1" height="1" fill="#404156"/><rect x="4" y="7" width="8" height="1" fill="#5a7080"/><rect x="12" y="7" width="1" height="1" fill="#404156"/><rect x="3" y="8" width="1" height="1" fill="#404156"/><rect x="4" y="8" width="8" height="1" fill="#8a8a92"/><rect x="12" y="8" width="1" height="1" fill="#404156"/><rect x="3" y="9" width="10" height="1" fill="#5a6a78"/><rect x="4" y="10" width="8" height="1" fill="#7a8a98"/>`
  ]; // 🐱 寧 NING_FRAMES 結束

// ── 待機動畫播放 8 FPS
(function startSpriteAnim() {
  var ANIM_FPS = 8;
  var runners = [
    { id:'svgHana',   frames: FLOWER_FRAMES },
    { id:'svgMonkey', frames: MONKEY_FRAMES },
    { id:'svgNing',   frames: NING_FRAMES   },
  ];
  var frame = 0;
  setInterval(function() {
    runners.forEach(function(r) {
      var el = document.getElementById(r.id);
      if (el) el.innerHTML = r.frames[frame % r.frames.length];
    });
    frame++;
  }, 1000 / ANIM_FPS);
})();
