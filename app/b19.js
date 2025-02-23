

let btn = document.getElementById("submit");
btn?.addEventListener("click", async function () {

    let userInfo = document.getElementById('userInfo')
    window.b19_list = null;
    window.gameuser = null;

    userInfo.style.opacity = 0;
    userInfo.style.marginTop = '-3rem';
    let fncBtn = document.getElementById('fnc-btn')
    fncBtn.style.height = '0rem';
    fncBtn.style.opacity = 0;
    let input = document.getElementById("i-name");

    let user
    try {
        user = new PhigrosUser(input.value);
        // let user = new PhigrosUser("uhrmqs8v0mmn0ikzxqgozrctr");
        await user.buildRecord();

    } catch (e) {
        swal("token非法", `${input.value}\n${e}`, "error");
        return false
    }
    console.log(user);
    window.save = new Save(user);
    console.log(save);

    let money = save.gameProgress.money
    let gameuser = {
        avatar: getInfo.idgetavatar(save.gameuser.avatar) || 'Introduction',
        ChallengeMode: (save.saveInfo.summary.challengeModeRank - (save.saveInfo.summary.challengeModeRank % 100)) / 100,
        ChallengeModeRank: save.saveInfo.summary.challengeModeRank % 100,
        rks: save.saveInfo.summary.rankingScore,
        data: `${money[4] ? `${money[4]}PiB ` : ''}${money[3] ? `${money[3]}TiB ` : ''}${money[2] ? `${money[2]}GiB ` : ''}${money[1] ? `${money[1]}MiB ` : ''}${money[0] ? `${money[0]}KiB ` : ''}`,
        selfIntro: save.gameuser.selfIntro,
        backgroundUrl: fCompute.getBackground(save.gameuser.background),
        PlayerId: fCompute.convertRichText(save.saveInfo.PlayerId),
    }

    window.gameuser = gameuser
    window.name = window.location.href;

    userInfo.innerHTML = `<div class="userId">
            <p>${gameuser.PlayerId}</p>
        </div>
        <div class="userAva">
            <img src="/phi-html/resources/html/avatar/${gameuser.avatar}.png" alt="avatar">
        </div>
        <div class="clg_rks">
            <div class="webClg">
                <img src="/phi-html/resources/html/otherimg/${gameuser.ChallengeMode}.png" alt="Challenge">
                <p>${gameuser.ChallengeModeRank}</p>
            </div>
            <div class="webRks">
                <p>${gameuser.rks.toFixed(4)}</p>
            </div>
        </div>`

    userInfo.style.opacity = 1;
    userInfo.style.marginTop = '0';
    // fncBtn.innerHTML 

    fncBtn.innerHTML = `<button class="btn" onclick="openB19()">查看B19</button>`
    fncBtn.innerHTML += `<button class="btn" onclick="openBN()">查看BN</button>`
    fncBtn.style.height = '2.8rem';
    fncBtn.style.opacity = 1;
});

async function openB19() {
    window.b19_list = await window.save.getB19(30);
    let b19Page = open('/phi-html/resources/html/b19/displayB19.html', '_blank');
}

async function openBN() {
    swal({
        title: "请输入数量",
        text: "请输入要显示的BN数量",
        content: "input",
        button: {
            text: "确认",
            closeModal: false,
        },
    }).then(async (value) => {

        if (!Number(value)) {
            swal("请输入数字", "请重新输入", "error");
            swal.stopLoading()
            return false
        }

        window.b19_list = await window.save.getB19(Number(value));
        console.log(Number(value));
        console.log(window.b19_list);
        swal.close()
        let b19Page = open('./phi-html/resources/html/b19/displayB19.html', '_blank');
    });
}