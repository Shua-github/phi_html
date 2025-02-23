class LevelRecord {
    constructor() {
        this.fc = false;
        this.score = 0;
        this.acc = 0.0;
    }
}

class Util {
    static getBit(data, index) {
        return (data & (1 << index)) ? true : false
    }
    static modifyBit(data, index, b) {
        let result = 1 << index;
        if (b) {
            data |= result;
        } else {
            data &= ~result;
        }
        return data;
    }
}

class Base64 {
    static decode(data) {
        // 解码 Base64 字符串
        let binaryString = atob(data);

        // 将二进制字符串转换为 Uint8Array
        let len = binaryString.length;
        let bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        // 将 Uint8Array 转换为十六进制字符串
        let hexString = '';
        for (let i = 0; i < bytes.length; i++) {
            let hex = bytes[i].toString(16);
            if (hex.length === 1) {
                hex = '0' + hex;
            }
            hexString += hex;
        }

        return hexString;
    }
}

class ByteReader {
    constructor(data, position = 0) {
        this.data = new Uint8Array(data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        this.position = position;
    }

    /** 返回剩余的字节数 */
    remaining() {
        return this.data.length - this.position;
    }

    getByte() {
        return this.data[this.position++];
    }

    putByte(num) {
        this.data[this.position++] = num;
    }

    /**
     * @returns {string} base64
     */
    getAllByte() {
        let binaryString = "";
        for (let i = this.position; i < this.data.length; i++) {
            binaryString += String.fromCharCode(this.data[i]);
        }
        return btoa(binaryString);
    }

    getShort() {
        this.position += 2;
        return (this.data[this.position - 1] << 8) ^ (this.data[this.position - 2] & 0xff);
    }

    putShort(num) {
        this.data[this.position++] = num & 0xff;
        this.data[this.position++] = (num >>> 8) & 0xff;
    }

    getInt() {
        this.position += 4;
        return (
            (this.data[this.position - 1] << 24) ^
            ((this.data[this.position - 2] & 0xff) << 16) ^
            ((this.data[this.position - 3] & 0xff) << 8) ^
            (this.data[this.position - 4] & 0xff)
        );
    }

    putInt(num) {
        this.data[this.position] = num & 0xff;
        this.data[this.position + 1] = (num >>> 8) & 0xff;
        this.data[this.position + 2] = (num >>> 16) & 0xff;
        this.data[this.position + 3] = (num >>> 24) & 0xff;
        this.position += 4;
    }

    getFloat() {
        let buffer = new ArrayBuffer(4);
        let view = new DataView(buffer);
        for (let i = 0; i < 4; i++) {
            view.setUint8(i, this.data[this.position + i]);
        }
        this.position += 4;
        return view.getFloat32(0, true);
    }

    putFloat(num) {
        let buffer = new ArrayBuffer(4);
        let view = new DataView(buffer);
        view.setFloat32(0, num, true);
        for (let i = 0; i < 4; i++) {
            this.data[this.position + i] = view.getUint8(i);
        }
        this.position += 4;
    }

    getVarInt() {
        if (this.data[this.position] > 127) {
            this.position += 2;
            return Number(0b01111111 & this.data[this.position - 2]) ^ (this.data[this.position - 1] << 7);
        } else {
            return this.data[this.position++];
        }
    }

    skipVarInt(num) {
        if (num) {
            for (; num > 0; num--) {
                this.skipVarInt();
            }
        } else {
            if (this.data[this.position] < 0) this.position += 2;
            else this.position++;
        }
    }

    getBytes() {
        let length = this.getByte();
        this.position += length;
        return this.data.subarray(this.position - length, this.position);
    }

    getString() {
        let length = this.getVarInt();
        this.position += length;
        return new TextDecoder("utf-8").decode(this.data.subarray(this.position - length, this.position));
    }

    putString(s) {
        let encoder = new TextEncoder();
        let encoded = encoder.encode(s);
        this.data[this.position++] = encoded.length;
        this.data.set(encoded, this.position);
        this.position += encoded.length;
    }

    skipString() {
        this.position += this.getByte() + 1;
    }

    insertBytes(bytes) {
        let result = new Uint8Array(this.data.length + bytes.length);
        result.set(this.data.subarray(0, this.position), 0);
        result.set(bytes, this.position);
        result.set(this.data.subarray(this.position), this.position + bytes.length);
        this.data = result;
    }

    replaceBytes(length, bytes) {
        if (bytes.length == length) {
            this.data.set(bytes, this.position);
            return;
        }
        let result = new Uint8Array(this.data.length + bytes.length - length);
        result.set(this.data.subarray(0, this.position), 0);
        result.set(bytes, this.position);
        result.set(this.data.subarray(this.position + length), this.position + bytes.length);
        this.data = result;
    }
}



class Summary {
    constructor(summary) {
        let now = Date().toString()
        let time = now.split(' ')
        this.updatedAt = `${time[3]} ${time[1]}.${time[2]} ${time[4]}`
        this.saveVersion = 0;
        this.challengeModeRank = 0;
        this.rankingScore = 0;
        this.gameVersion = 0;
        this.avatar = '';

        this.cleared = [];
        this.fullCombo = [];
        this.phi = [];

        const reader = new ByteReader(Base64.decode(summary));
        this.saveVersion = reader.getByte();
        this.challengeModeRank = reader.getShort();
        this.rankingScore = reader.getFloat();
        this.gameVersion = reader.getByte();
        this.avatar = reader.getString();
        this.cleared = [];
        this.fullCombo = [];
        this.phi = [];
        for (let level = 0; level < 4; level++) {
            this.cleared[level] = reader.getShort();
            this.fullCombo[level] = reader.getShort();
            this.phi[level] = reader.getShort();
        }
    }
}

async function Decrypt(word) {
    let key = CryptoJS.enc.Base64.parse("6Jaa0qVAJZuXkZCLiOa/Ax5tIZVu+taKUN1V1nqwkks=")
    let iv = CryptoJS.enc.Base64.parse("Kk/wisgNYwcAV8WVGMgyUw==")
    // const key = Buffer.from([-24, -106, -102, -46, -91, 64, 37, -101, -105, -111, -112, -117, -120, -26, -65, 3, 30, 109, 33, -107, 110, -6, -42, -118, 80, -35, 85, -42, 122, -80, -110, 75]).toString('base64')
    // const iv = Buffer.from([42, 79, -16, -118, -56, 13, 99, 7, 0, 87, -59, -107, 24, -56, 50, 83]).toString("base64")
    const decrypt = CryptoJS.AES.decrypt(word, key, {
        iv: iv
    })
    let result = decrypt.toString(CryptoJS.enc.Hex)
    return result;
}

class SaveManager {
    static baseUrl = "https://rak3ffdi.cloud.tds1.tapapis.cn/1.1";
    static fileTokens = this.baseUrl + "/fileTokens";
    static fileCallback = this.baseUrl + "/fileCallback";
    static save = this.baseUrl + "/classes/_GameSave";
    static userInfo = this.baseUrl + "/users/me";
    static files = this.baseUrl + "/files/"
    static headers = {
        'X-LC-Id': 'rAK3FfdieFob2Nn8Am',
        'X-LC-Key': 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0',
        'User-Agent': 'LeanCloud-CSharp-SDK/1.0.3',
        'Accept': 'application/json',
    };


    static async getPlayerId(session) {
        let request = await fetch(this.userInfo, { headers: { ...this.headers, 'X-LC-Session': session } })

        let response = await request.json()

        return response.nickname;
    }

    /**
     * 
     * @param {String} session 
     * @returns Array
     */
    static async saveArray(session) {
        let request = await fetch(this.save, { headers: { ...this.headers, 'X-LC-Session': session } })


        let response = await request.json()

        return response.results;
    }

    /**
     * 
     * @param {String} session 
     * @returns Array|Objct
     */
    static async saveCheck(session) {
        let array = await this.saveArray(session);

        let size = array.length;
        if (size == 0)
            throw new Error("存档不存在,sessionToken: " + session);
        else {
            let results = []
            for (let i in array) {
                array[i].summary = new Summary(array[i].summary)
                array[i].PlayerId = await this.getPlayerId(session)
                let date = new Date(array[i].updatedAt).toString()
                let time = date.split(' ')
                array[i].updatedAt = `${time[3]} ${time[1]}.${time[2]} ${time[4]}`

                if (array[i].gameFile) {
                    array[i] = {
                        createdAt: array[i].createdAt,
                        gameFile: {
                            createdAt: array[i].gameFile.createdAt,
                            key: array[i].gameFile.key,
                            objectId: array[i].gameFile.objectId,
                            updatedAt: array[i].gameFile.updatedAt,
                            url: array[i].gameFile.url
                        },
                        modifiedAt: array[i].modifiedAt,
                        objectId: array[i].objectId,
                        summary: array[i].summary,
                        updatedAt: array[i].updatedAt,
                        user: array[i].user,
                        PlayerId: array[i].PlayerId
                    };
                    results.push(array[i])
                }

                // array[i].gameFile = await this.client.send(await this.globalRequest.copy().header("X-LC-Session", session).uri(this.files + array[i].gameFile.id).build());
            }
            return results;
        }
    }


    // static key = Buffer.from([-24, -106, -102, -46, -91, 64, 37, -101, -105, -111, -112, -117, -120, -26, -65, 3, 30, 109, 33, -107, 110, -6, -42, -118, 80, -35, 85, -42, 122, -80, -110, 75]).toString('hex')
    // static iv = Buffer.from([42, 79, -16, -118, -56, 13, 99, 7, 0, 87, -59, -107, 24, -56, 50, 83]).toString('hex')

    static async decrypt(data) {
        try {
            return Decrypt(data)
        } catch (e) {
            throw new Error(e);
        }
    }
}

class GameProgress {
    constructor(data) {
        let Reader = new ByteReader(data)
        let tem = Reader.getByte()
        this.isFirstRun = Util.getBit(tem, 0)
        this.legacyChapterFinished = Util.getBit(tem, 1)
        this.alreadyShowCollectionTip = Util.getBit(tem, 2)
        this.alreadyShowAutoUnlockINTip = Util.getBit(tem, 3)
        this.completed = Reader.getString()
        this.songUpdateInfo = Reader.getVarInt()
        this.challengeModeRank = Reader.getShort()
        this.money = [0, 0, 0, 0, 0];
        this.money[0] = Reader.getVarInt()
        this.money[1] = Reader.getVarInt()
        this.money[2] = Reader.getVarInt()
        this.money[3] = Reader.getVarInt()
        this.money[4] = Reader.getVarInt()
        this.unlockFlagOfSpasmodic = Reader.getByte()
        this.unlockFlagOfIgallta = Reader.getByte()
        this.unlockFlagOfRrharil = Reader.getByte()
        this.flagOfSongRecordKey = Reader.getByte()
        this.randomVersionUnlocked = Reader.getByte()
        tem = Reader.getByte()
        this.chapter8UnlockBegin = Util.getBit(tem, 0)
        this.chapter8UnlockSecondPhase = Util.getBit(tem, 1)
        this.chapter8Passed = Util.getBit(tem, 2)
        this.chapter8SongUnlocked = Reader.getByte()
    }
}

class GameRecord {
    static name = "gameRecord";
    static version = 1;
    constructor(data) {
        this.name = "gameRecord";
        this.version = 1;
        this.data = new ByteReader(data)
        this.Record = {}
        this.songsnum = 0
    }

    /**
     * 
     * @param {Array} err 错误消息
     */
    async init(err) {
        this.songsnum = this.data.getVarInt()
        while (this.data.remaining() > 0) {
            let key = this.data.getString().replace(/\.0$/, '');
            this.data.skipVarInt()
            let length = this.data.getByte();
            let fc = this.data.getByte();
            let song = [];


            for (let level = 0; level < 5; level++) {
                if (Util.getBit(length, level)) {
                    song[level] = new LevelRecord();
                    song[level].score = this.data.getInt();
                    song[level].acc = this.data.getFloat();
                    song[level].fc = (song[level].score == 1000000 && song[level].acc == 100) ? true : Util.getBit(fc, level);

                }
            }
            // if (!getInfo.idgetsong(key)) {
            //     err.push(key)
            // }
            this.Record[key] = song
        }
    }
}

class GameSettings {
    constructor(data) {
        let Reader = new ByteReader(data)
        let tem = Reader.getByte()
        this.chordSupport = Util.getBit(tem, 0);
        this.fcAPIndicator = Util.getBit(tem, 1);
        this.enableHitSound = Util.getBit(tem, 2);
        this.lowResolutionMode = Util.getBit(tem, 3);
        this.deviceName = Reader.getString();
        this.bright = Reader.getFloat();
        this.musicVolume = Reader.getFloat();
        this.effectVolume = Reader.getFloat();
        this.hitSoundVolume = Reader.getFloat();
        this.soundOffset = Reader.getFloat();
        this.noteScale = Reader.getFloat();
    }
}

class GameUser {
    constructor(data) {
        this.name = "user";
        this.version = 1;
        let Reader = new ByteReader(data)
        this.showPlayerId = Util.getBit(Reader.getByte(), 0);
        this.selfIntro = Reader.getString();
        this.avatar = Reader.getString();
        this.background = Reader.getString();
    }
}

class PhigrosUser {


    constructor(session) {
        this.sessionToken = ''
        this.saveInfo = {}
        this.gameRecord = {}
        if (!session || !session.match(/[a-z0-9]{25}/))
            throw new Error("SessionToken格式错误");
        this.sessionToken = session;

    }

    /**
     * 获取 SaveInfo
     */
    async getSaveInfo() {
        this.saveInfo = await SaveManager.saveCheck(this.sessionToken)

        if (this.saveInfo[0] && this.saveInfo[0].createdAt) {
            /**多个存档默认选择第一个 */
            this.saveInfo = this.saveInfo[0]
        } else {
            logger.error(`[Phi-Plugin]错误的存档`)
            logger.error(this.saveInfo)
            throw new Error("未找到存档QAQ！")
        }

        try {
            this.saveUrl = new URL(this.saveInfo.gameFile.url);
        } catch (err) {

            logger.error("[phi-plugin]设置saveUrl失败！", err)

            throw new Error(err)
        }
        return this.saveInfo
    }

    /**
     * 
     * @returns 返回未绑定的信息数组，没有则为false
     */
    async buildRecord() {
        if (!this.saveUrl) {

            await this.getSaveInfo()

        }
        if (this.saveUrl) {
            /**从saveurl获取存档zip */
            let save = await fetch(this.saveUrl, { method: 'GET' })

            try {
                var savezip = await JSZip.loadAsync(await save.arrayBuffer())

            } catch (err) {
                logger.error(err)
                throw new Error("解压zip文件失败！ " + err)

            }


            /**插件存档版本 */
            this.Recordver = 1.0

            /**获取 gameProgress */
            let file = new ByteReader(Base64.decode(await savezip.file('gameProgress').async('base64')))
            file.getByte()
            this.gameProgress = new GameProgress(await SaveManager.decrypt(file.getAllByte()))

            /**获取 gameuser */
            file = new ByteReader(Base64.decode(await savezip.file('user').async('base64')))
            file.getByte()
            this.gameuser = new GameUser(await SaveManager.decrypt(file.getAllByte()))

            /**获取 gamesetting */
            file = new ByteReader(Base64.decode(await savezip.file('settings').async('base64')))
            file.getByte()
            this.gamesettings = new GameSettings(await SaveManager.decrypt(file.getAllByte()))

            /**获取gameRecord */
            file = new ByteReader(Base64.decode(await savezip.file('gameRecord').async('base64')))
            if (file.getByte() != GameRecord.version) {
                this.gameRecord = {}

                logger.info("版本号已更新，请更新PhigrosLibrary。");

                throw new Error("版本号已更新")
            }
            let Record = new GameRecord(await SaveManager.decrypt(file.getAllByte()));
            const err = []
            await Record.init(err)
            this.gameRecord = Record.Record
            if (err) {
                return err
            }

        } else {
            logger.info("获取存档链接失败！")

            throw new Error("获取存档链接失败！")
        }
        return null
    }

}