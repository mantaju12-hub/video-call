const APP_ID = "ac26a49edc47430dabc2a24e698d1b57"
const TOKEN = "007eJxTYIiP+aK6OdLPVMdu6deXBbdiOa5FOQrveXc2/eKCg37dNbMVGAwNE5NNklOTkiyM00zSLE0tLExTjMwtU9MsEk3MUiwts8J0MhoCGRm2bNzNzMgAgSA+C0NuYmYeAwMAlNQgmg=="
const CHANNEL = "main"

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' })

let localTracks = []
let remoteUsers = {}

let currentChannel = CHANNEL;
let inviteLink = window.location.href;

function generateInviteLink() {
    const roomId = Date.now().toString(36);
    currentChannel = roomId;
    inviteLink = `${window.location.origin}${window.location.pathname}?room=${roomId}`;
    document.getElementById('invite-link').value = inviteLink;
}

function copyLink() {
    navigator.clipboard.writeText(inviteLink);
    showNotification('Link copied!');
}

function showNotification(text) {
    const notification = document.getElementById('copy-notification');
    notification.innerText = text;
    notification.style.display = 'block';
    setTimeout(() => notification.style.display = 'none', 2000);
}

let joinAndDisplayLocalStream = async() => {
    client.on('user-published', handleUserJoined)
    client.on('user-left', handleUserLeft)

    const urlParams = new URLSearchParams(window.location.search);
    currentChannel = urlParams.get('room') || CHANNEL;

    let UID = await client.join(APP_ID, currentChannel, TOKEN, null)

    try {
        localTracks = await AgoraRTC.createMicrophoneAndCameraTracks()
    } catch (err) {
        alert('Could not access camera/microphone. Please allow permissions and try again.')
        return
    }

    let player = `<div class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}"></div>
                  </div>`
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

    localTracks[1].play(`user-${UID}`)

    await client.publish([localTracks[0], localTracks[1]])
}

let joinStream = async() => {
    await joinAndDisplayLocalStream()
    document.getElementById('join-btn').style.display = 'none'
    document.getElementById('stream-controls').style.display = 'flex'
}

let handleUserJoined = async(user, mediaType) => {
    remoteUsers[user.uid] = user
    await client.subscribe(user, mediaType)

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`)
        if (player != null) {
            player.remove()
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div> 
                 </div>`
        document.getElementById('video-streams').insertAdjacentHTML('beforeend', player)

        user.videoTrack.play(`user-${user.uid}`)
    }

    if (mediaType === 'audio') {
        user.audioTrack.play()
    }
}

let handleUserLeft = async(user) => {
    delete remoteUsers[user.uid]
    document.getElementById(`user-container-${user.uid}`).remove()
}

let leaveAndRemoveLocalStream = async() => {
    for (let i = 0; localTracks.length > i; i++) {
        localTracks[i].stop()
        localTracks[i].close()
    }

    await client.leave()
    document.getElementById('join-btn').style.display = 'block'
    document.getElementById('stream-controls').style.display = 'none'
    document.getElementById('video-streams').innerHTML = ''
}

let toggleMic = async(e) => {
    if (localTracks[0].muted) {
        await localTracks[0].setMuted(false)
        e.target.innerText = 'Mic on'
        e.target.style.backgroundColor = 'cadetblue'
    } else {
        await localTracks[0].setMuted(true)
        e.target.innerText = 'Mic off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

let toggleCamera = async(e) => {
    if (localTracks[1].muted) {
        await localTracks[1].setMuted(false)
        e.target.innerText = 'Camera on'
        e.target.style.backgroundColor = 'cadetblue'
    } else {
        await localTracks[1].setMuted(true)
        e.target.innerText = 'Camera off'
        e.target.style.backgroundColor = '#EE4B2B'
    }
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream)
    document.getElementById('mic-btn').addEventListener('click', toggleMic)
    document.getElementById('camera-btn').addEventListener('click', toggleCamera)

    document.getElementById('join-btn').addEventListener('click', joinStream);

    // Telegram sharing button
    document.getElementById('telegram-btn').addEventListener('click', function() {
        const siteUrl = window.location.origin + window.location.pathname;
        const channel = CHANNEL;
        const shareUrl = `${siteUrl}?channel=${encodeURIComponent(channel)}`;
        const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=Join%20my%20video%20call!`;
        window.open(telegramUrl, '_blank');
    })

    document.getElementById('invite-btn').addEventListener('click', () => {
        generateInviteLink();
        document.getElementById('invite-section').style.display = 'flex';
    });
    document.getElementById('copy-link-btn').addEventListener('click', copyLink);
});