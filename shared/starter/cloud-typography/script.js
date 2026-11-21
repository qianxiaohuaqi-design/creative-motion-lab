/**
 * Lesson 01 — 将一句话拆成可独立控制的单词元素。
 * 以后可以为每个 span.word 添加微风、点击和云雾消散动画。
 */

const cloudText = document.getElementById("cloud-text");

if (cloudText) {
  // 读取原始标题，去除两端空格，再根据连续空白拆成单词
  const sentence = cloudText.textContent.trim();
  const words = sentence.split(/\s+/);

  // 清空原先作为整体的文字
  cloudText.textContent = "";

  // 为每个单词创建一个独立的 span
  words.forEach((word, index) => {
    const span = document.createElement("span");
    span.className = "word";
    span.textContent = word;
    cloudText.append(span);

    // 单词之间用文本节点添加空格，允许正常换行
    if (index < words.length - 1) {
      cloudText.append(" ");
    }
  });

  console.log("Cloud Typography | Lesson 01:", words.length, "words created");
}

// TODO L02：给每个单词绑定 click 事件，练习淡出 / 重新出现。
// TODO L03：使用时间和连续噪声，模拟云朵随风轻轻漂移。
// TODO L04-L05：通过 Canvas 粒子，让文字真正变成云雾并重新凝聚。
