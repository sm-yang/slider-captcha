const { Builder, By } = require('selenium-webdriver')

;(async () => {
  /**
   * 打开验证码
   */
  // 打开浏览器
  const driver = new Builder().forBrowser('chrome').build()
  // 加载腾讯防水墙官网
  await driver.get('https://007.qq.com/online.html')
  // 点击体验验证码按钮
  (await driver.findElement(By.id('code'))).click()
  // 等验证码加载完
  await driver.sleep(2000)

  /**
   * 进入验证码的iframe里
   */
  const frame = await driver.findElement(By.id('tcaptcha_iframe'))
  await driver.switchTo().frame(frame)

  /**
   * 前端计算出对齐缺口需要的偏移值
   */
  let offset = await driver.executeScript(() => {
    // 获取背景图及其宽高
    const bg = document.getElementById('slideBg')
    const w = bg.naturalWidth
    const h = bg.naturalHeight
    // 把背景绘制到canvas中，用于获取每个像素的数据
    const cvs = document.createElement('canvas')
    cvs.width = w
    cvs.height = h
    const ctx = cvs.getContext('2d')
    ctx.drawImage(bg, 0, 0)
    // 获取不会收到凹凸影响的某一行：滑块top * 2 + 方块顶部偏移值(23) + 会受到凹凸影响的高度(16) + 1
    // 在该行中寻找符合规则的索引：白 + 黑*87 + 白
    const y = parseInt($('#slideBlock').css('top')) * 2 + 40
    let lastWhite = -1
    for (let x = w / 2; x < w; x ++) {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      const grey = (r * 299 + g * 587 + b * 114) / 1000
      // 以150为阈值，大于该值的认定为白色
      if (grey > 150) {
        if (lastWhite === -1 || x - lastWhite !== 88) {
          lastWhite = x
        } else {
          lastWhite /= 2 // 图片缩小了2倍
          lastWhite -= 37 // 滑块left(26) + 方块自身偏移值(23 / 2)
          lastWhite >>= 0 // 移动的像素必须为整数
          return lastWhite
        }
      }
    }
  })

  /**
   * 执行滑块拖动操作
   */
  // 找到iframe中的滑块元素
  const slide = await driver.findElement(By.id('tcaptcha_drag_thumb'))
  // 将鼠标移动到滑块上并按下左键
  const actions = driver.actions().move({origin: slide}).press()
  // 每次以20ms随机拖动2-10个像素，当与目标位置差值在5像素内时停止
  let current = 0
  while (Math.abs(offset - current) > 5) {
    const distance = Math.round(Math.random() * 8) + 2
    current += distance
    actions.move({origin: slide, x: distance, duration: 20})
    console.log(`moving: ${current} / ${offset}`)
  }
  // 松开鼠标左键
  await actions.release().perform()
})()
