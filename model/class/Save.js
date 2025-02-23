class Chart {
    constructor(data) {
        this.id = data?.id
        this.rank = data?.rank
        this.charter = data.charter
        this.difficulty = Number(data.difficulty)
        this.tap = Number(data.tap)
        this.drag = Number(data.drag)
        this.hold = Number(data.hold)
        this.flicke = Number(data.flicke)
        this.combo = Number(data.combo)
    }
}

function Rating(score, fc) {
    if (score >= 1000000)
        return 'phi'
    else if (fc)
        return 'FC'
    else if (!score)
        return 'NEW'
    else if (score < 700000)
        return 'F'
    else if (score < 820000)
        return 'C'
    else if (score < 880000)
        return 'B'
    else if (score < 920000)
        return 'A'
    else if (score < 960000)
        return 'S'
    else
        return 'V'
}

class LevelRecordInfo {


    /**
     * @param data 原始数据
     * @param id 曲目id
     * @param rank 难度
     */
    constructor(data, id, rank) {


        this.fc = data.fc;
        this.score = data.score;
        this.acc = data.acc;
        this.id = id

        let info = getInfo.info(id)

        if (!info) {
            return
        }

        this.rank = getInfo.Level[rank] //AT IN HD EZ LEGACY 
        this.song = info.song //曲名
        this.illustration = getInfo.getill(id) //曲绘链接
        this.illustrationBlur = getInfo.getill(id, 'blur') //模糊曲绘链接
        this.illustrationLow = getInfo.getill(id, 'low') //低分辨率曲绘链接
        this.Rating = Rating(this.score, this.fc) //V S A 


        if (info.chart && info.chart[this.rank]?.difficulty) {
            this.difficulty = info.chart[this.rank]['difficulty'] //难度
            this.rks = fCompute.rks(this.acc, this.difficulty) //等效rks
        } else {
            this.difficulty = 0
            this.rks = 0
        }
    }
}


class Save {
    /**
     * @param {Save} data 
     * @param {boolean} ignore 跳过存档检查
     */
    constructor(data, ignore = false) {
        this.sessionToken = data.sessionToken || (data).session
        this.modifiedAt = data.saveInfo.modifiedAt.iso
        this.saveInfo = data.saveInfo
        this.saveUrl = data.saveUrl + ''
        this.Recordver = data.Recordver
        this.gameProgress = data.gameProgress
        this.gameuser = data.gameuser
        this.gameRecord = {}
        for (let id in data.gameRecord) {
            let nid = id.replace(/\.0$/, '')
            this.gameRecord[nid] = []
            for (let i in data.gameRecord[id]) {
                let level = Number(i)
                if (!data.gameRecord[id][level]) {
                    this.gameRecord[nid][level] = null
                    continue
                }
                this.gameRecord[nid][level] = new LevelRecordInfo(data.gameRecord[id][level], nid, level)
                if (ignore) continue
                if (data.gameRecord[id][level].acc > 100) {
                    logger.error(`acc > 100 ${this.sessionToken}`)
                }
            }
        }
    }
    /**
     * 获取存档
     * @returns 按照 rks 排序的数组W
     */
    getRecord() {
        if (this.sortedRecord) {
            return this.sortedRecord
        }
        let sortedRecord = []
        for (let id in this.gameRecord) {
            for (let level in this.gameRecord[id]) {
                if (Number(level) == 4) break
                let tem = this.gameRecord[id][level]
                if (!tem?.score) continue
                sortedRecord.push(tem)
            }
        }

        sortedRecord.sort((a, b) => { return b.rks - a.rks })
        this.sortedRecord = sortedRecord
        return sortedRecord
    }

    /**
     * 筛选满足ACC条件的成绩
     * @param {number} acc ≥acc
     * @param {boolean} [same=false] 是否筛选最高rks
     * @returns 按照rks排序的数组
     */
    findAccRecord(acc, same = false) {
        let record = []
        for (let id in this.gameRecord) {
            for (let level in this.gameRecord[id]) {
                /**LEGACY */
                if (Number(level) == 4) break
                let tem = this.gameRecord[id][level]
                if (!tem) continue
                if (tem.acc >= acc) {
                    record.push(tem)
                }
            }
        }
        record.sort((a, b) => { return b.rks - a.rks })
        if (same) {
            for (let i = 0; i < record.length - 1; i++) {
                if (record[i].rks != record[i + 1]?.rks) {
                    return record.slice(0, i + 1)
                }
            }
        }
        return record
    }

    /**计算rks+0.01的最低所需要提升的rks */
    minUpRks() {
        /**考虑屁股肉四舍五入原则 */
        let minuprks = Math.floor(this.saveInfo.summary.rankingScore * 100) / 100 + 0.005 - this.saveInfo.summary.rankingScore
        return minuprks < 0 ? minuprks + 0.01 : minuprks
    }

    /**简单检查存档是否存在问题 */
    checkRecord() {
        let error = ``
        const Level = ['EZ', 'HD', 'IN', 'AT', 'LEGACY']
        for (let i in this.gameRecord) {
            for (let j in this.gameRecord[i]) {
                let score = this.gameRecord[i][j]
                if (score.acc > 100 || score.acc < 0 || score.score > 1000000 || score.score < 0) {
                    error += `\n${i} ${Level[j]} ${score.fc} ${score.acc} ${score.score} 非法的成绩`
                }
                // if (!score.fc && (score.score >= 1000000 || score.acc >= 100)) {
                //     error += `\n${i} ${Level[j]} ${score.fc} ${score.acc} ${score.score} 不符合预期的值`
                // }
                if ((score.score >= 1000000 && score.acc < 100) || (score.score < 1000000 && score.acc >= 100)) {
                    error += `\n${i} ${Level[j]} ${score.fc} ${score.acc} ${score.score} 成绩不自洽`
                }
            }
        }
        return error
    }

    /**
     * 
     * @param {string} id 曲目id
     */
    getSongsRecord(id) {
        if (!this.gameRecord[id]) {
            return []
        }
        return [...this.gameRecord[id]]
    }

    /**
     * 
     * @param {number} num B几
     * @returns b19_list
     */
    getB19(num) {
        if (this.B19List) {
            return this.B19List
        }
        /**计算得到的rks，仅作为测试使用 */
        let sum_rks = 0
        /**满分且 rks 最高的成绩数组 */
        let philist = this.findAccRecord(100)
        /**p3 */
        let phi = philist.splice(0, Math.min(philist.length, 3))

        // console.info(phi)
        /**处理数据 */
        for (let i = 0; i < 3; ++i) {
            if (!phi[i]) {
                phi[i] = false
                continue
            }
            if (phi[i]?.rks) {
                let tem = {}
                Object.assign(tem, phi[i])
                phi[i] = tem
                sum_rks += Number(phi[i].rks) //计算rks
                phi[i].illustration = getInfo.getill(phi[i].id)
                phi[i].num = 'P' + (i + 1)
                phi[i].suggest = "无法推分"
            }
        }

        /**所有成绩 */
        let rkslist = this.getRecord()
        /**真实 rks */
        let userrks = this.saveInfo.summary.rankingScore
        /**考虑屁股肉四舍五入原则的最小上升rks */
        let minuprks = Math.floor(userrks * 100) / 100 + 0.005 - userrks
        if (minuprks < 0) {
            minuprks += 0.01
        }

        
        /**bestN 列表 */
        let b19_list = []
        for (let i = 0; i < num && i < rkslist.length; ++i) {
            /**计算rks */
            if (i < 27) sum_rks += Number(rkslist[i].rks)
            /**是 Best 几 */
            rkslist[i].num = i + 1
            /**推分建议 */
            if (rkslist[i].rks < 100) {
                rkslist[i].suggest = fCompute.suggest(Number((i < 26) ? rkslist[i].rks : rkslist[26].rks) + minuprks * 30, rkslist[i].difficulty, 2)
                if (rkslist[i].suggest.includes('无') && (!phi?.[0] || (rkslist[i].rks > phi[phi.length - 1].rks)) && rkslist[i].rks < 100) {
                    rkslist[i].suggest = "100.00%"
                }
            } else {
                rkslist[i].suggest = "无法推分"
            }
            /**曲绘 */
            rkslist[i].illustration = getInfo.getill(rkslist[i].id, 'common')
            /**b19列表 */
            b19_list.push(rkslist[i])
            if (!rkslist[i].rks) {
                console.info(rkslist[i])
            }
        }

        let com_rks = sum_rks / 30

        this.B19List = { phi, b19_list }

        this.b19_rks = b19_list[Math.min(b19_list.length - 1, 26)].rks
        return [...phi, ...b19_list]
    }

    /**
     * 
     * @param {string} id 
     * @param {number} lv 
     * @param {number} count 保留位数
     * @param {number} difficulty 
     * @returns 
     */
    getSuggest(id, lv, count) {
        if (!this.b19_rks) {
            let record = this.getRecord()
            this.b19_rks = record.length > 26 ? record[26].rks : 0
            this.b0_rks = this.findAccRecord(100, true)[0]?.rks
        }
        // console.info(this.b19_rks, this.gameRecord[id][lv]?.rks ? this.gameRecord[id][lv].rks : 0, this.gameRecord[id])
        let suggest = ''
        if (!this.gameRecord[id] || !this.gameRecord[id][lv] || !this.gameRecord[id][lv].rks) {
            suggest = fCompute.suggest(Math.max(this.b19_rks, 0) + this.minUpRks() * 30, difficulty, count)
        } else {
            suggest = fCompute.suggest(Math.max(this.b19_rks, this.gameRecord[id][lv].rks) + this.minUpRks() * 30, difficulty, count)
        }
        return suggest.includes('无') ? (difficulty > this.b0_rks + this.minUpRks() * 30 ? Number(100).toFixed(count) + '%' : suggest) : suggest
    }

    /**
     * 获取存档RKS
     * @returns {number}
     */
    getRks() {
        return Number(this.saveInfo.summary.rankingScore)
    }

    /**
     * 获取存档sessionToken
     */
    getSessionToken() {
        return this.sessionToken
    }
}