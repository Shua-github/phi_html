const filesPath = 'https://gitee.com/catrong/phi-plugin/raw/main/'

let infoPath = '/info/'

async function fetchFile(path, branch = "main") {
    const url = `https://api.github.com/repos/catrong/phi-plugin-resources/contents/${path}?ref=${branch}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Error fetching file: ${response.statusText}`);
    }
    const fileData = await response.json();
    // 文件内容是 Base64 编码的，需要解码
    const content = atob(fileData.content);
    const uint8Array = new Uint8Array(content.split('').map(char => char.charCodeAt(0)));
    const decoder = new TextDecoder("utf-8");
    const decodedContent = decoder.decode(uint8Array);
    return decodedContent;
}

async function parseCSV(data) {
    return (await Papa.parse(data, {
        header: true,
        skipEmptyLines: true
    })).data;
}

function parseYAML(data) {
    return jsyaml.load(data)
}

function parseJSON(data) {
    return JSON.parse(data)
}

class getInfo {
    static set(infodata) {
        let { csv_avatar, CsvInfo, Csvdif, nicklist, tips, Jsoninfo, notesInfo } = infodata
        console.info({ csv_avatar, CsvInfo, Csvdif, nicklist, tips, Jsoninfo, notesInfo })
        this.CsvInfo = CsvInfo
        this.Csvdif = Csvdif
        this.nicklist = nicklist
        /**Tips [] */
        this.tips = tips
        this.Jsoninfo = Jsoninfo
        this.notesInfo = notesInfo
        /**以别名为key */
        this.songnick = {}

        /**头像id */
        this.avatarid = {}

        /**原版信息 */
        this.ori_info = {}
        /**通过id获取曲名 */
        this.songById = {}
        /**原曲名称获取id */
        this.idBySong = {}
        /**含有曲绘的曲目列表，id */
        this.illlist = []
        /**按dif分的info */
        this.info_by_difficulty = {}

        /**难度映射 */
        this.Level = ['EZ', 'HD', 'IN', 'AT', 'LEGACY']

        /**最高定数 */
        this.MAX_DIFFICULTY = 0


        this.avatarid = {}
        for (let i in csv_avatar) {
            this.avatarid[csv_avatar[i].id] = csv_avatar[i].name
        }

        /**所有曲目id列表 */
        this.idlist = []
        for (let id in this.nicklist) {
            for (let j in this.nicklist[id]) {
                if (this.songnick[this.nicklist[id][j]]) {
                    this.songnick[this.nicklist[id][j]].push(id)
                } else {
                    this.songnick[this.nicklist[id][j]] = [id]
                }
            }
        }

        for (let i in CsvInfo) {
            let id = CsvInfo[i].id
            this.songById[id] = CsvInfo[i].song
            this.idBySong[CsvInfo[i].song] = id

            this.ori_info[id] = Jsoninfo[id]
            if (!Jsoninfo[id]) {
                this.ori_info[id] = { song: CsvInfo[i].song, chapter: '', bpm: '', length: '', chart: {} }
                console.info(`[phi-plugin]曲目详情未更新：${CsvInfo[i].song}`)
            }
            this.ori_info[id].song = CsvInfo[i].song
            this.ori_info[id].id = id
            this.ori_info[id].composer = CsvInfo[i].composer
            this.ori_info[id].illustrator = CsvInfo[i].illustrator
            this.ori_info[id].chart = {}
            for (let j in this.Level) {
                const level = this.Level[j]
                if (CsvInfo[i][level]) {

                    if (!this.ori_info[id].chart[level]) {
                        this.ori_info[id].chart[level] = {}
                    }
                    this.ori_info[id].chart[level].charter = CsvInfo[i][level]
                    this.ori_info[id].chart[level].difficulty = Csvdif[i][level]
                    this.ori_info[id].chart[level].tap = notesInfo[id][level].tap
                    this.ori_info[id].chart[level].drag = notesInfo[id][level].drag
                    this.ori_info[id].chart[level].hold = notesInfo[id][level].hold
                    this.ori_info[id].chart[level].flicke = notesInfo[id][level].flicke
                    this.ori_info[id].chart[level].combo = notesInfo[id][level].tap + notesInfo[id][level].drag + notesInfo[id][level].hold + notesInfo[id][level].flicke

                    /**最高定数 */
                    this.MAX_DIFFICULTY = Math.max(this.MAX_DIFFICULTY, Number(Csvdif[i][level]))
                }
            }
            this.illlist.push(id)
            this.idlist.push(id)
        }

        for (let id in this.ori_info) {
            for (let level in this.ori_info[id].chart) {
                let info = this.ori_info[id]
                if (this.info_by_difficulty[info.chart[level].difficulty]) {
                    this.info_by_difficulty[info.chart[level].difficulty].push({
                        id: info.id,
                        rank: level,
                        ...info.chart[level],
                    })
                } else {
                    this.info_by_difficulty[info.chart[level].difficulty] = [{
                        id: info.id,
                        rank: level,
                        ...info.chart[level],
                    }]
                }
            }
        }
    }

    /**
     * 返回原曲信息
     * @param {string} id 原曲id
     * @returns {SongsInfo}
     */
    static info(id) {
        let result = { ...this.ori_info, ...this.sp_info }
        let info = result[id]
        if (!info) {
            return null
        }
        return {
            /**id */
            id: info.id,
            /**曲目 */
            song: info.song,
            /**小型曲绘 */
            illustration: info.illustration,
            /**原版曲绘 */
            illustration_big: this.getill(info.id),
            /**是否不参与猜字母 */
            can_t_be_letter: info.can_t_be_letter || true,
            /**是否不参与猜曲绘 */
            can_t_be_guessill: info.can_t_be_guessill || true,
            /**章节 */
            chapter: info.chapter,
            /**bpm */
            bpm: info.bpm,
            /**作曲 */
            composer: info.composer,
            /**时长 */
            length: info.length,
            /**画师 */
            illustrator: info.illustrator,
            /**特殊信息 */
            spinfo: info.spinfo,
            /**谱面详情 */
            chart: info.chart
        }


    }

    /**
     * 返回所有曲目信息
     * @returns 
     */
    static all_info() {
        return { ...this.ori_info, ...this.sp_info }
    }

    /**
    * 根据参数模糊匹配返回id数组
    * @param {string} mic 别名
    * @param {number} [Distance=0.85] 阈值 猜词0.95
    * @returns 原曲id数组，按照匹配程度降序
    */
    static fuzzysongsnick(mic, Distance = 0.85) {
        const fuzzyMatch = (str1, str2) => {
            if (str1 == str2) {
                return 1
            }
            //首先第一次去除空格和其他符号，并转换为小写
            const pattern = /[\s~`!@#$%^&*()\-=_+\]{}|;:'",<.>/?！￥…（）—【】、；‘：“”，《。》？↑↓←→]/g
            const formattedStr1 = str1.replace(pattern, '').toLowerCase()
            const formattedStr2 = str2.replace(pattern, '').toLowerCase()

            //第二次再计算str1和str2之间的JaroWinkler距离
            const distance = this.jaroWinklerDistance(formattedStr1, formattedStr2)

            //如果距离大于等于某个阈值，则认为匹配
            //可以根据实际情况调整这个阈值
            return distance
        }

        /**按照匹配程度排序 */
        let result = []

        let allinfo = this.all_info()

        for (let std in this.songnick) {
            let dis = fuzzyMatch(mic, std)
            if (dis >= Distance) {
                for (let i in this.songnick[std]) {
                    result.push({ id: this.songnick[std][i], dis: dis })
                }
            }
        }
        for (let id in allinfo) {
            let std = allinfo[id].song
            let dis = fuzzyMatch(mic, std)
            if (dis >= Distance) {
                result.push({ id: id, dis: dis })
            }
        }

        result = result.sort((a, b) => b.dis - a.dis)

        let all = []
        for (let i in result) {

            if (all.includes(result[i].song)) continue //去重
            /**如果有完全匹配的曲目则放弃剩下的 */
            if (result[0].dis == 1 && result[i].dis < 1) break


            all.push(result[i].id)
        }

        return all
    }

    //采用Jaro-Winkler编辑距离算法来计算str间的相似度，复杂度为O(n)=>n为较长的那个字符出的长度
    static jaroWinklerDistance(s1, s2) {
        let m = 0 //匹配的字符数量

        //如果任任一字符串为空则距离为0
        if (s1.length === 0 || s2.length === 0) {
            return 0
        }

        //字符串完全匹配，距离为1
        if (s1 === s2) {
            return 1
        }

        let range = (Math.floor(Math.max(s1.length, s2.length) / 2)) - 1, //搜索范围
            s1Matches = new Array(s1.length),
            s2Matches = new Array(s2.length)

        //查找匹配的字符
        for (let i = 0; i < s1.length; i++) {
            let low = (i >= range) ? i - range : 0,
                high = (i + range <= (s2.length - 1)) ? (i + range) : (s2.length - 1)

            for (let j = low; j <= high; j++) {
                if (s1Matches[i] !== true && s2Matches[j] !== true && s1[i] === s2[j]) {
                    ++m
                    s1Matches[i] = s2Matches[j] = true
                    break
                }
            }
        }

        //如果没有匹配的字符，那么捏Jaro距离为0
        if (m === 0) {
            return 0
        }

        //计算转置的数量
        let k = 0, n_trans = 0
        for (let i = 0; i < s1.length; i++) {
            if (s1Matches[i] === true) {
                let j
                for (j = k; j < s2.length; j++) {
                    if (s2Matches[j] === true) {
                        k = j + 1
                        break
                    }
                }

                if (s1[i] !== s2[j]) {
                    ++n_trans
                }
            }
        }

        //计算Jaro距离
        let weight = (m / s1.length + m / s2.length + (m - (n_trans / 2)) / m) / 3,
            l = 0,
            p = 0.1

        //如果Jaro距离大于0.7，计算Jaro-Winkler距离
        if (weight > 0.7) {
            while (s1[l] === s2[l] && l < 4) {
                ++l
            }

            weight = weight + l * p * (1 - weight)
        }

        return weight
    }


    /**
     * id获取曲绘，返回地址
     * @param {string} id id
     * @param {'common' | 'blur' | 'low'} kind 清晰度
     * @return 网址或文件地址
    */
    static getill(id, kind = 'common') {
        // console.info(id)
        let songsinfo = this.all_info()[id]
        let ans = songsinfo?.illustration_big
        let reg = /^(?:(http|https|ftp):\/\/)((?:[\w-]+\.)+[a-z0-9]+)((?:\/[^/?#]*)+)?(\?[^#]+)?(#.+)?$/i
        if (ans && !reg.test(ans)) {
            ans = `/phi-html/resources/otherill/${ans}`
        } else if (this.ori_info[id]) {
            let kk
            switch (kind) {
                case 'common':
                    kk = 'ill'
                    break
                case 'blur':
                    kk = 'illBlur'
                    break
                case 'low':
                    kk = 'illLow'
                    break
            }
            ans = `/phi-html/ill/${kk}/${id}.png`
        }
        if (!ans) {
            ans = `https://raw.githubusercontent.com/Catrong/phi-plugin/refs/heads/main/resources/html/otherimg/phigros.png`
        }
        return ans;
    }

    /**
     * 返回章节封面 url
     * @param {string} name 标准章节名
     */
    static getChapIll(name) {
        return `/phi-html/ill/chap/${name}.png`
    }

    /**
     * 通过id获得头像文件名称
     * @param id 
     * @returns file name
     */
    static idgetavatar(id) {
        if (this.avatarid[id]) {
            return this.avatarid[id]
        } else {
            return 'Introduction'
        }
    }

    /**
     * 根据曲目id获取原名
     * @param {string} id 曲目id
     * @returns 原名
     */
    static idgetsong(id) {
        id.replace('.0', '')
        return this.songById[id]
    }

    /**
     * 通过原曲曲目获取曲目id
     * @param {string} song 原曲曲名
     * @returns 曲目id
     */
    static SongGetId(song) {
        return this.idBySong[song]
    }
}

function posAdd(elm) {
    let top = Number(elm.style.top.replace('rem', ''))
    elm.style.top = ++top + 'rem'
}

async function update(version) {
    let updateInfoState = document.getElementById('updateInfoState')
    updateInfoState.innerHTML = '正在更新'
    let poz = document.getElementById('poz')
    let csv_avatar = await parseCSV(await fetchFile(infoPath + 'avatar.csv'))
    posAdd(poz)
    let CsvInfo = await parseCSV(await fetchFile(infoPath + 'info.csv'))
    posAdd(poz)
    let Csvdif = await parseCSV(await fetchFile(infoPath + 'difficulty.csv'))
    posAdd(poz)
    let nicklist = parseYAML(await fetchFile(infoPath + 'nicklist.yaml'))
    posAdd(poz)
    let tips = parseYAML(await fetchFile(infoPath + 'tips.yaml'))
    posAdd(poz)
    let Jsoninfo = parseJSON(await fetchFile(infoPath + 'infolist.json'))
    posAdd(poz)
    let notesInfo = parseJSON(await fetchFile(infoPath + 'notesInfo.json'))
    posAdd(poz)
    localStorage.setItem('infodata', JSON.stringify({ csv_avatar, CsvInfo, Csvdif, nicklist, tips, Jsoninfo, notesInfo, version }))
    return { csv_avatar, CsvInfo, Csvdif, nicklist, tips, Jsoninfo, notesInfo }
}

async function getFile() {
    let poz = document.getElementById('poz')
    let localp = document.getElementById('local')
    let lastestp = document.getElementById('lastest')
    let infodata = localStorage.getItem('infodata')
    let version = await fetchFile('README.md')
    lastestp.innerHTML = 'lastest ' + version
    if (!infodata) {
        localp.innerHTML = 'no info'
        infodata = await update(version)

    } else {
        infodata = JSON.parse(infodata)
        localp.innerHTML = 'local' + infodata.version
        if (infodata.version != version) {
            infodata = update(version)
        }
    }
    let updateInfoState = document.getElementById('updateInfoState')
    updateInfoState.innerHTML = '更新完成'


    getInfo.set(infodata)
    let loading = document.getElementById('loading')
    loading.style.opacity = 0;
    loading.style.top = '-3rem';
    await new Promise(resolve => setTimeout(resolve, 500));
    loading.style.display = 'none';
    let tokenBox = document.getElementById('tokenBox')
    tokenBox.style.opacity = 1;
    tokenBox.style.top = '1rem';
}

getFile()