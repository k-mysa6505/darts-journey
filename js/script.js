// Google Maps APIを使用してダーツゲームを実装するJavaScriptコード
// 注意: このコードは、secrets.jsonファイルからAPIキーを読み込むことを前提としています。

const mapElement = document.getElementById('map');
const dartElement = document.getElementById('dart');
const resultOverlay = document.getElementById('result-overlay');
const resultText = document.getElementById('result-text');
const resetButton = document.getElementById('reset-button');
const apiKeyMissingMessage = document.getElementById('api-key-missing-message');
const reloadButton = document.getElementById('reload-button');

let map; // Google Mapオブジェクト
let currentDartPosition = { x: 0, y: 0 };
let isDragging = false;
let mapBounds; // 地図の表示範囲（ダーツの命中判定用）
let Maps_API_KEY = ''; // APIキーはここに格納される
let marker = null; // 的中地点のマーカーを保持する変数

// secrets.jsonからAPIキーを読み込む関数
async function loadApiKey() {
    try {
        const response = await fetch('secrets.json');
        if (!response.ok) {
            // secrets.jsonファイルが見つからない、またはアクセスできない場合
            throw new Error(`Failed to load secrets.json: ${response.statusText}`);
        }
        const data = await response.json();
        Maps_API_KEY = data.Maps_API_KEY;

        if (!Maps_API_KEY || Maps_API_KEY === 'YOUR_ACTUAL_Maps_API_KEY') {
            // APIキーが空、またはデフォルト値のままの場合
            throw new Error("APIキーがsecrets.jsonに正しく設定されていません。");
        }
        loadGoogleMapsScript(); // APIキーが読み込めたらGoogle Maps APIをロード
    } catch (error) {
        console.error("APIキーのロードに失敗しました:", error);
        // APIキーがない場合のメッセージを表示
        apiKeyMissingMessage.classList.add('active');
        // ダーツのドラッグを無効化
        dartElement.style.pointerEvents = 'none';
    }
}

// Google Maps APIをロードする関数
function loadGoogleMapsScript() {
    // APIキーが正常に設定されているか最終チェック
    if (!Maps_API_KEY || Maps_API_KEY === 'YOUR_ACTUAL_Maps_API_KEY') {
        apiKeyMissingMessage.classList.add('active');
        dartElement.style.pointerEvents = 'none';
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&libraries=geometry`;
    script.async = true;
    script.defer = true;
    script.onload = initMap; // APIがロードされたらinitMapを呼び出す
    script.onerror = () => {
        // APIキーが不正だった場合などのエラーハンドリング
        console.error("Google Maps APIのロードに失敗しました。APIキーが不正な可能性があります。");
        // エラーメッセージを表示
        apiKeyMissingMessage.querySelector('h2').textContent = 'APIキーが不正です';
        apiKeyMissingMessage.querySelector('p').textContent = '入力されたAPIキーで地図を読み込めませんでした。APIキーを確認して、再度お試しください。';
        apiKeyMissingMessage.classList.add('active');
        dartElement.style.pointerEvents = 'none'; // ダーツの操作を無効に
    };
    document.head.appendChild(script);
}

// 地図を初期化する関数
function initMap() {
    const center = { lat: 35.6895, lng: 139.6917 }; // 日本の中心に近い東京の緯度経度
    const zoomLevel = 5; // 日本全体が見える程度のズームレベル

    map = new google.maps.Map(mapElement, {
        center: center,
        zoom: zoomLevel,
        disableDefaultUI: true, // デフォルトのUI（ズームボタンなど）を無効にする
        gestureHandling: 'none' // 地図のスクロールやズームジェスチャーを無効にする
    });

    // 地図の表示範囲を取得
    google.maps.event.addListenerOnce(map, 'idle', () => {
        mapBounds = map.getBounds();
        console.log('Map bounds:', mapBounds.toJSON());
        resetDart();
        dartElement.style.pointerEvents = 'auto'; // 地図がロードされたらダーツを操作可能に
    });

    // ウィンドウのリサイズ時に地図の表示範囲を更新
    window.addEventListener('resize', () => {
        google.maps.event.addListenerOnce(map, 'idle', () => {
            mapBounds = map.getBounds();
        });
    });
}

// ダーツのドラッグを開始する関数
function startDrag(e) {
    if (!Maps_API_KEY || !map) { // APIキーがないか地図がロードされていなければ無効
        alert("ダーツを投げる前にAPIキーを設定し、地図をロードしてください。");
        return;
    }
    e.preventDefault();
    isDragging = true;
    dartElement.style.cursor = 'grabbing';

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    currentDartPosition.x = clientX - dartElement.getBoundingClientRect().left;
    currentDartPosition.y = clientY - dartElement.getBoundingClientRect().top;

    document.addEventListener('mousemove', dragDart);
    document.addEventListener('mouseup', endDrag);
    document.addEventListener('touchmove', dragDart, { passive: false });
    document.addEventListener('touchend', endDrag);
}

// ダーツをドラッグ中の関数
function dragDart(e) {
    if (!isDragging) return;

    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

    let newX = clientX - currentDartPosition.x;
    let newY = clientY - currentDartPosition.y;

    const mapRect = mapElement.getBoundingClientRect();
    const dartHalfWidth = dartElement.offsetWidth / 2;
    const dartHalfHeight = dartElement.offsetHeight / 2;

    const centerX = mapRect.left + mapRect.width / 2;
    const centerY = mapRect.top + mapRect.height / 2;
    const radius = mapRect.width / 2;

    const dartCenterX = newX + dartHalfWidth;
    const dartCenterY = newY + dartHalfHeight;

    const distance = Math.sqrt(Math.pow(dartCenterX - centerX, 2) + Math.pow(dartCenterY - centerY, 2));

    if (distance > radius - Math.max(dartHalfWidth, dartHalfHeight)) {
        const angle = Math.atan2(dartCenterY - centerY, dartCenterX - centerX);
        newX = centerX + (radius - Math.max(dartHalfWidth, dartHalfHeight)) * Math.cos(angle) - dartHalfWidth;
        newY = centerY + (radius - Math.max(dartHalfWidth, dartHalfHeight)) * Math.sin(angle) - dartHalfHeight;
    }

    dartElement.style.left = `${newX}px`;
    dartElement.style.top = `${newY}px`;
}

// ダーツを投げ終える関数
async function endDrag(e) {
    if (!isDragging) return;
    isDragging = false;
    dartElement.style.cursor = 'grab';

    document.removeEventListener('mousemove', dragDart);
    document.removeEventListener('mouseup', endDrag);
    document.removeEventListener('touchmove', dragDart);
    document.removeEventListener('touchend', endDrag);

    const dartRect = dartElement.getBoundingClientRect();
    const hitX = dartRect.left + dartRect.width / 2;
    const hitY = dartRect.top + dartRect.height / 2;

    const hitLatLng = screenToLatLng(hitX, hitY);

    if (mapBounds && hitLatLng && mapBounds.contains(hitLatLng)) {
        dartElement.style.transition = 'none';

        await getPlaceName(hitLatLng);
    } else {
        resultText.textContent = "ダーツが地図外に飛んでいきました！";
        showResultOverlay();
    }
}

// スクリーン座標（ピクセル）を緯度経度座標に変換する関数
function screenToLatLng(x, y) {
    if (!map || !map.getProjection()) {
        console.error("Map or Projection is not ready.");
        return null;
    }

    const mapDivRect = mapElement.getBoundingClientRect();

    const relativeX = x - mapDivRect.left;
    const relativeY = y - mapDivRect.top;

    const topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
    const bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
    
    const worldWidth = topRight.x - bottomLeft.x;
    const worldHeight = bottomLeft.y - topRight.y;

    if (mapDivRect.width === 0 || mapDivRect.height === 0) {
        console.error("Map element has zero width or height.");
        return null;
    }

    const worldPoint = new google.maps.Point(
        bottomLeft.x + (relativeX / mapDivRect.width) * worldWidth,
        topRight.y + (relativeY / mapDivRect.height) * worldHeight
    );

    return map.getProjection().fromPointToLatLng(worldPoint);
}

// 的中地点の地名を取得する関数
async function getPlaceName(latLng) {
    const geocoder = new google.maps.Geocoder();
    try {
        const response = await geocoder.geocode({ location: latLng });
        if (response.results[0]) {
            const addressComponents = response.results[0].address_components;
            let placeName = "不明な場所";

            for (const component of addressComponents) {
                if (component.types.includes("administrative_area_level_1")) {
                    placeName = component.long_name;
                    break;
                } else if (component.types.includes("locality")) {
                    placeName = component.long_name;
                    break;
                } else if (component.types.includes("sublocality")) {
                    placeName = component.long_name;
                } else if (component.types.includes("political") && placeName === "不明な場所") {
                    placeName = component.long_name;
                }
            }
            resultText.textContent = `的中！ ${placeName}へようこそ！`;

            if (marker) {
                marker.setMap(null);
            }
            marker = new google.maps.Marker({
                position: latLng,
                map: map,
                title: placeName
            });
        } else {
            resultText.textContent = "この場所の地名は見つかりませんでした。";
        }
    } catch (error) {
        console.error("Geocoding failed:", error);
        resultText.textContent = "地名取得に失敗しました。エラーが発生しました。";
    } finally {
        showResultOverlay();
    }
}

// 結果オーバーレイを表示する関数
function showResultOverlay() {
    resultOverlay.classList.add('active');
}

// ダーツと結果をリセットする関数
function resetDart() {
    dartElement.style.transition = 'all 0.3s ease-in-out';
    const mapRect = mapElement.getBoundingClientRect();
    dartElement.style.left = `${mapRect.left + mapRect.width / 2 - dartElement.offsetWidth / 2}px`;
    dartElement.style.top = `${mapRect.top - dartElement.offsetHeight - 20}px`;
    resultOverlay.classList.remove('active');

    if (marker) {
        marker.setMap(null);
        marker = null;
    }
}

// --- イベントリスナーの設定 ---

// ダーツのドラッグ開始イベント
dartElement.addEventListener('mousedown', startDrag);
dartElement.addEventListener('touchstart', startDrag, { passive: false });

// リセットボタンのクリックイベント
resetButton.addEventListener('click', () => {
    resetDart();
});

// 再読み込みボタンのクリックイベント
reloadButton.addEventListener('click', () => {
    window.location.reload(); // ページを再読み込み
});

// アプリケーション起動時にAPIキーをロード
window.onload = loadApiKey;
