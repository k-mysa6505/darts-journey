class JapanDartGame {
    constructor() {
        this.map = null;
        this.marker = null;
        this.dart = document.getElementById('dart');
        this.isDragging = false;
        this.startPos = { x: 0, y: 0 };
        this.currentPos = { x: 0, y: 0 };
        this.apiKey = null;

        this.init();
    }

    async init() {
        try {
            this.createDartboardNumbers();
            await this.loadApiKey();
            await this.initMap();
            this.setupDartControls();
        } catch (error) {
            console.error('初期化エラー:', error);
            this.showApiNotice();
        }
    }

    createDartboardNumbers() {
        // 本場のダーツボードの数字配列（12時位置から時計回り）
        const dartNumbers = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
        const numbersContainer = document.getElementById('dartboardNumbers');

        dartNumbers.forEach((number, index) => {
            const numberElement = document.createElement('div');
            numberElement.className = 'number';
            numberElement.textContent = number;

            // 角度計算（12時位置を0度として時計回り）
            const angle = (index * 18) - 90; // -90で12時位置を基準にする
            const radian = (angle * Math.PI) / 180;

            // 数字の配置位置（リングの内側、地図の外側）
            const radius = 42.5; // パーセンテージで指定
            const x = 50 + radius * Math.cos(radian);
            const y = 50 + radius * Math.sin(radian);

            numberElement.style.left = `${x}%`;
            numberElement.style.top = `${y}%`;

            numbersContainer.appendChild(numberElement);
        });
    }

    async loadApiKey() {
        try {
            const response = await fetch('./json/secrets.json');
            const secrets = await response.json();
            this.apiKey = secrets.GOOGLE_MAPS_API_KEY;

            if (!this.apiKey) {
                throw new Error('APIキーが見つかりません');
            }
        } catch (error) {
            throw new Error('APIキーの読み込みに失敗しました: ' + error.message);
        }
    }

    showApiNotice() {
        document.getElementById('apiNotice').style.display = 'block';
    }

    async initMap() {
        // Google Maps APIを動的に読み込み
        if (!window.google) {
            await this.loadGoogleMapsAPI();
        }

        // 日本地図の初期化
        this.map = new google.maps.Map(document.getElementById('map'), {
            center: { lat: 37.50, lng: 138.25 }, // 中心座標
            zoom: 4.4,
            disableDefaultUI: true, // デフォルトUIを無効化
            draggable: false, // ドラッグを無効化
            scrollwheel: false, // スクロールズームを無効化
            disableDoubleClickZoom: true,
            mapId: "f6fdaa66c37122753343cab5"
        });
    }

    loadGoogleMapsAPI() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=geometry,marker&v=beta`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    setupDartControls() {
        // タッチ/マウスイベントの設定
        this.dart.addEventListener('mousedown', this.handleStart.bind(this));
        this.dart.addEventListener('touchstart', this.handleStart.bind(this));

        document.addEventListener('mousemove', this.handleMove.bind(this));
        document.addEventListener('touchmove', this.handleMove.bind(this));

        document.addEventListener('mouseup', this.handleEnd.bind(this));
        document.addEventListener('touchend', this.handleEnd.bind(this));
    }

    handleStart(e) {
        this.isDragging = true;

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        this.startPos = { x: clientX, y: clientY };
        this.dart.style.cursor = 'grabbing';
    }

    handleMove(e) {
        if (!this.isDragging) return;

        const clientX = e.clientX || e.touches[0].clientX;
        const clientY = e.clientY || e.touches[0].clientY;

        this.currentPos = { x: clientX, y: clientY };

        // ダーツの位置を更新
        const deltaX = clientX - this.startPos.x;
        const deltaY = clientY - this.startPos.y;

        this.dart.style.transform = `translateX(calc(-50% + ${deltaX}px)) translateY(${deltaY}px)`;
    }

    handleEnd(e) {
        if (!this.isDragging) return;

        this.isDragging = false;
        this.dart.style.cursor = 'grab';

        // ダーツを投げるアニメーション
        this.throwDart();
    }

    async throwDart() {
        // 投げる方向と力を計算
        const deltaX = this.currentPos.x - this.startPos.x;
        const deltaY = this.currentPos.y - this.startPos.y;
        const force = Math.min(Math.sqrt(deltaX * deltaX + deltaY * deltaY) / 5, 50);

        // ランダムな命中地点を生成（日本の範囲内）
        const hitPoint = this.generateRandomHitPoint();

        // アニメーション
        await this.animateDartThrow(hitPoint);

        // 結果を表示
        await this.showResult(hitPoint);
    }

    generateRandomHitPoint() {
        // 日本の大まかな範囲内でランダムな座標を生成
        const lat = 30 + Math.random() * 15; // 30-45度
        const lng = 129 + Math.random() * 16; // 129-145度

        return { lat, lng };
    }

    async animateDartThrow(hitPoint) {
        return new Promise(resolve => {
            // 地図上の座標をピクセル座標に変換
            const mapContainer = document.querySelector('.map-container');
            const mapRect = mapContainer.getBoundingClientRect();
            const centerX = mapRect.left + mapRect.width / 2;
            const centerY = mapRect.top + mapRect.height / 2;

            // ランダムなオフセットを追加して命中地点を決定
            const offsetX = (Math.random() - 0.5) * mapRect.width * 0.6;
            const offsetY = (Math.random() - 0.5) * mapRect.height * 0.6;

            const targetX = centerX + offsetX - window.innerWidth / 2;
            const targetY = centerY + offsetY - window.innerHeight / 2;

            // アニメーション
            this.dart.style.transition = 'all 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.dart.style.transform = `translateX(${targetX}px) translateY(${targetY}px) scale(0.7)`;

            setTimeout(() => {
                this.dart.style.transition = '';
                resolve();
            }, 1000);
        });
    }

    async showResult(hitPoint) {
        try {
            // Geocoding APIで地名を取得
            const locationName = await this.getLocationName(hitPoint.lat, hitPoint.lng);

            // マーカーを追加
            if (this.marker) {
                this.marker.setMap(null);
            }

            this.marker = new google.maps.marker.AdvancedMarkerElement({
                map: this.map,
                position: { lat: hitPoint.lat, lng: hitPoint.lng },
                title: locationName,
            });

            // 結果表示
            document.getElementById('resultText').innerHTML = `
                <strong>${locationName}</strong><br>
                <small>緯度: ${hitPoint.lat.toFixed(4)}, 経度: ${hitPoint.lng.toFixed(4)}</small><br>
                <p style="margin-top: 10px;">素敵な場所に命中しました！旅行の計画を立ててみませんか？</p>
            `;

            document.getElementById('resultOverlay').style.display = 'flex';

        } catch (error) {
            console.error('結果表示エラー:', error);
            document.getElementById('resultText').textContent = '結果の取得に失敗しました。もう一度お試しください。';
            document.getElementById('resultOverlay').style.display = 'flex';
        }
    }

    async getLocationName(lat, lng) {
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}&language=ja`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const address = data.results[0].formatted_address;
                return address.replace('日本、', '');
            } else {
                return '未知の場所';
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            return '地名の取得に失敗しました';
        }
    }

    resetDart() {
        this.dart.style.transform = 'translateX(-50%)';
        this.dart.style.transition = 'all 0.5s ease';

        setTimeout(() => {
            this.dart.style.transition = '';
        }, 500);
    }
}

// 結果を閉じる関数
function closeResult() {
    document.getElementById('resultOverlay').style.display = 'none';
    game.resetDart();
}

// ゲーム開始
let game;
window.addEventListener('load', () => {
    game = new JapanDartGame();
});