
let AppKey = 'Qr9AEqtuoSVS3zeD6iVbM4ZC0AtkJcQ89tywVyi0';
let ClientId = 'rAK3FfdieFob2Nn8Am';

class LCHelper {
    static md5HashHexStringDefaultGetter(input) {
        return CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);
    }

    static async loginWithAuthData(data, failOnNotExist = false) {
        let authData = { taptap: data }
        let path = failOnNotExist ? 'users?failOnNotExist=true' : 'users';
        let response = await this.request(path, 'post', { authData });
        return response.json();
    }

    static async loginAndGetToken(data, failOnNotExist = false) {
        let response = await this.loginWithAuthData(data, failOnNotExist);
        return response;
    }

    static async request(path, method, data = null, queryParams = null, withAPIVersion = true) {
        let url = `https://rak3ffdi.cloud.tds1.tapapis.cn/1.1/users`
        let headers = {
            'X-LC-Id': ClientId,
            'Content-Type': 'application/json'
        };

        this.fillHeaders(headers)

        let response = await fetch(url, {
            method,
            headers,
            body: JSON.stringify(data),
        });

        return response
    }

    static buildUrl(path, queryParams, withAPIVersion) {
        let url = "https://rak3ffdi.cloud.tds1.tapapis.cn";
        if (withAPIVersion) {
            url += '/1.1';
        }
        url += `/${path}`;

        if (queryParams) {
            let queryPairs = Object.entries(queryParams)
                .filter(([, value]) => value !== null)
                .map(([key, value]) => `${key}=${encodeURIComponent(value.toString())}`);
            let queries = queryPairs.join('&');
            url += `?${queries}`;
        }
        return url;
    }

    static fillHeaders(headers, reqHeaders = null) {
        if (reqHeaders !== null) {
            Object.entries(reqHeaders).forEach(([key, value]) => {
                headers[key] = value.toString();
            });
        }

        let timestamp = Math.floor(Date.now() / 1000);
        let data = `${timestamp}${AppKey}`;
        let hash = CryptoJS.MD5(data).toString(CryptoJS.enc.Hex);
        let sign = `${hash},${timestamp}`;
        headers['X-LC-Sign'] = sign;
    }
}

class CompleteQRCodeData {
    /**
     * @param {} code - 部分 TapTap QR 码数据对象。
     */
    constructor(code) {
        this.deviceID = code.deviceId;
        this.deviceCode = code.data.device_code;
        this.expiresInSeconds = code.data.expires_in;
        this.url = code.data.qrcode_url;
        this.interval = code.data.interval;
    }
}

class TapTapHelper {
    static TapSDKVersion = '2.1';
    static WebHost = 'https://accounts.tapapis.com';
    static ChinaWebHost = 'https://accounts.tapapis.cn';
    static ApiHost = 'https://open.tapapis.com';
    static ChinaApiHost = 'https://open.tapapis.cn';
    static CodeUrl = `${this.WebHost}/oauth2/v1/device/code`;
    static ChinaCodeUrl = `${this.ChinaWebHost}/oauth2/v1/device/code`;
    static TokenUrl = `${this.WebHost}/oauth2/v1/token`;
    static ChinaTokenUrl = `${this.ChinaWebHost}/oauth2/v1/token`;


    static GetChinaProfileUrl(havePublicProfile = true) {
        return havePublicProfile ? this.ChinaApiHost + "/account/profile/v1?client_id=" : this.ChinaApiHost + "/account/basic-info/v1?client_id=";
    }

    static async requestLoginQrCode(permissions = ['public_profile'], useChinaEndpoint = true) {
        let clientId = crypto.randomUUID().replace(/\-/g, '')

        let params = new FormData()
        params.append('client_id', "rAK3FfdieFob2Nn8Am");
        params.append("response_type", "device_code");
        params.append("scope", permissions.join(','));
        params.append("version", this.TapSDKVersion);
        params.append("platform", "unity");
        params.append("info", JSON.stringify({ device_id: clientId }));

        let endpoint = useChinaEndpoint ? this.ChinaCodeUrl : this.CodeUrl;
        let response = await fetch(endpoint, {
            method: 'POST',
            body: params
        });
        let data = await response.json();
        return { ...data, deviceId: clientId };
    }

    /**
     * 
     * @param {*} qrCodeData 
     * @param {*} useChinaEndpoint 
     * @returns 
     */
    static async checkQRCodeResult(data, useChinaEndpoint = true) {
        let qrCodeData = new CompleteQRCodeData(data)
        let params = new FormData();
        params.append('grant_type', 'device_token');
        params.append('client_id', "rAK3FfdieFob2Nn8Am");
        params.append("secret_type", "hmac-sha-1");
        params.append("code", qrCodeData.deviceCode);
        params.append("version", "1.0");
        params.append("platform", "unity");
        params.append("info", JSON.stringify({ device_id: qrCodeData.deviceID }));
        params.append("Access-Control-Allow-Origin", "*");

        let endpoint = useChinaEndpoint ? this.ChinaTokenUrl : this.TokenUrl;
        try {
            let response = await fetch(endpoint, {
                method: 'POST',
                body: params
            });
            let data = await response.json();
            return data;
        } catch (error) {
            // Handle error here
            console.error('Error checking QR code result:', error);
            return null;
        }
    }

    static async getProfile(token, useChinaEndpoint = true, timestamp = 0) {
        if (!token.scope.includes('public_profile')) {
            throw new Error('Public profile permission is required.');
        }

        let url;
        if (useChinaEndpoint) {
            url = `${this.ChinaApiHost}/account/profile/v1?client_id=rAK3FfdieFob2Nn8Am`; // Replace with actual client ID
        } else {
            url = `${this.ApiHost}/account/profile/v1?client_id=rAK3FfdieFob2Nn8Am`; // Replace with actual client ID
        }

        let method = 'GET';
        let authorizationHeader = getAuthorization(url, method, token.kid, token.mac_key);

        let response = await fetch(url, {
            method: 'GET',
            headers: { Authorization: authorizationHeader, "Access-Control-Allow-Origin": "*" },
        });

        return response.json();
    }
}

function getAuthorization(requestUrl, method, keyId, macKey) {
    const url = new URL(requestUrl);
    const time = (Math.floor(Date.now() / 1000).toString()).padStart(10, '0');
    const randomStr = getRandomString(16);
    const host = url.hostname;
    const uri = url.pathname + url.search;
    const port = url.port || (url.protocol === 'https:' ? '443' : '80');
    const other = '';
    const sign = signData(mergeData(time, randomStr, method, uri, host, port, other), macKey);

    return `MAC id="${keyId}", ts="${time}", nonce="${randomStr}", mac="${sign}"`;
}

function getRandomBytesBase64(size) {
    var array = new Uint8Array(size);
    window.crypto.getRandomValues(array);
    var binaryString = String.fromCharCode.apply(null, array);
    return btoa(binaryString);
}

function getRandomString(length) {
    return getRandomBytesBase64(length);
}

function mergeData(time, randomCode, httpType, uri, domain, port, other) {
    let prefix =
        `${time}\n${randomCode}\n${httpType}\n${uri}\n${domain}\n${port}\n`;

    if (!other) {
        prefix += '\n';
    } else {
        prefix += `${other}\n`;
    }

    return prefix;
}

function signData(signatureBaseString, key) {
    var hmac = CryptoJS.HmacSHA1(signatureBaseString, key);
    return CryptoJS.enc.Base64.stringify(hmac);
}

class getQRcode {
    /**
     * 获取登录二维码url
     */
    static async getRequest() {
        return await TapTapHelper.requestLoginQrCode()
    }

    /**
     * 生成url二维码
     * @param {string} url 链接
     * @param {Element} elm 二维码容器
     * @returns 二维码
     */
    static async getQRcode(url, elm) {
        return QRCode.toCanvas(elm, url)
    }

    /**
     * 检查二维码扫描结果
     * @returns authorization_pending authorization_waiting
     */
    static async checkQRCodeResult(request) {
        return await TapTapHelper.checkQRCodeResult(request)
    }

    /**
     * 获取sessionToken
     * @param {any} result 
     * @returns token
     */
    static async getSessionToken(result) {
        let profile = await TapTapHelper.getProfile(result.data)
        return (await LCHelper.loginAndGetToken({ ...profile.data, ...result.data })).sessionToken
    }
}

let qrcodeBtn = document.getElementById("submit");

qrcodeBtn?.addEventListener("click", async function () {
    let request = await getQRcode.getRequest()
    let url = request.data.qrcode_url
    let img = document.getElementById('qrBox')
    let qr = await getQRcode.getQRcode(url, img)
    let tip = document.getElementById('tip')
    let t1 = new Date();
    let result;
    /**是否发送过已扫描提示 */
    let flag = false;
    while ((new Date()).getTime() - t1.getTime() < request.data.expires_in * 1000) {
        result = await getQRcode.checkQRCodeResult(request);
        if (!result.success) {
            if (result.data.error == "authorization_waiting" && !flag) {
                tip.innerHTML = "登录二维码已扫描，请确认登录"
                flag = true;
            }
        } else {
            break
        }
        await new Promise(resolve => setTimeout(resolve, 2000))

    }

    if (!result.success) {
        tip.innerHTML = "操作超时，请重试！"
        return;
    }
    tip.innerHTML = ""

    let sessionToken = await getQRcode.getSessionToken(result)
    let input = document.createElement('i-name')
    input.setAttribute('value', sessionToken)
});