
function adjustFontSize() {
    //获取p元素
    let a = document.getElementsByName('pvis')
    for (let i = 0; i < a.length; ++i) {

        let songName = a[i]

        if (!songName) continue


        /*调整曲目名称字体大小*/
        let parentElement = songName.parentElement

        if (!(songName.scrollWidth > parentElement.offsetWidth || songName.scrollHeight > parentElement.offsetHeight)) continue

        let fontSize = Number(window.getComputedStyle(songName, null).getPropertyValue('font-size').replace("px", ""));


        for (let i = 31; i > 0; i--) {
            if (!(fontSize & (1 << i)))
                continue
            fontSize -= (1 << i)
            songName.style.fontSize = fontSize + "px"
            if (!(songName.scrollWidth > parentElement.offsetWidth || songName.scrollHeight > parentElement.offsetHeight)) {
                fontSize += (1 << i)
            }
        }

        --fontSize;
        songName.style.fontSize = fontSize + "px";
    }

}