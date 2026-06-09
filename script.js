const width = 800;
const height = 600;

// SVGを作成
const svg = d3
    .select("#map-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", `0 0 ${width} ${height}`);

// 都道府県別の公衆浴場数
const publicbath = {
    "北海道": 1208,
    "青森県": 470,
    "岩手県": 275,
    "宮城県": 380,
    "秋田県": 296,
    "山形県": 228,
    "福島県": 458,
    "茨城県": 476,
    "栃木県": 471,
    "群馬県": 409,
    "埼玉県": 600,
    "千葉県": 827,
    "東京都": 1891,
    "神奈川県": 1003,
    "新潟県": 604,
    "富山県": 245,
    "石川県": 341,
    "福井県": 162,
    "山梨県": 331,
    "長野県": 1176,
    "岐阜県": 508,
    "静岡県": 1249,
    "愛知県": 641,
    "三重県": 303,
    "滋賀県": 302,
    "京都府": 441,
    "大阪府": 808,
    "兵庫県": 985,
    "奈良県": 185,
    "和歌山県": 269,
    "鳥取県": 146,
    "島根県": 165,
    "岡山県": 298,
    "広島県": 408,
    "山口県": 321,
    "徳島県": 177,
    "香川県": 207,
    "愛媛県": 426,
    "高知県": 141,
    "福岡県": 696,
    "佐賀県": 261,
    "長崎県": 377,
    "熊本県": 697,
    "大分県": 567,
    "宮崎県": 225,
    "鹿児島県": 700,
    "沖縄県": 314
};



// 軒数に応じた色
const colorScale = d3
    .scaleSequential(d3.interpolateBlues)
    .domain([0, 800]);

const tooltip = d3.select("#tooltip");

// GeoJSONのポリゴンの向きを反転
function reverseGeometry(geometry) {
    if (!geometry) {
        return null;
    }

    if (geometry.type === "Polygon") {
        return {
            type: "Polygon",
            coordinates: geometry.coordinates.map(function (ring) {
                return [...ring].reverse();
            })
        };
    }

    if (geometry.type === "MultiPolygon") {
        return {
            type: "MultiPolygon",
            coordinates: geometry.coordinates.map(function (polygon) {
                return polygon.map(function (ring) {
                    return [...ring].reverse();
                });
            })
        };
    }

    return geometry;
}

// ランキングを作成
function createRanking() {
    const rankingList = document.querySelector("#ranking-list");

    // オブジェクトを配列に変換して、台数の多い順に並べる
    const sortedData = Object.entries(publicbath)
        .sort(function (a, b) {
            return b[1] - a[1];
        });

    // 上位10件を取得
    const topTen = sortedData.slice(0, 5);

    rankingList.innerHTML = "";

    topTen.forEach(function (item) {
        const prefectureName = item[0];
        const value = item[1];

        const listItem = document.createElement("li");

        listItem.innerHTML = `
            <span class="ranking-prefecture">
                ${prefectureName}
            </span>

            <span class="ranking-value">
                ${value.toLocaleString()} 軒
            </span>
        `;

        rankingList.appendChild(listItem);
    });
}

// ページ読み込み時にランキングを作成
createRanking();

// GeoJSONを読み込む
d3.json("./N03-20260101_prefecture(2).json")
    .then(function (geojson) {
        const features = geojson.features
            .filter(function (feature) {
                return feature.geometry !== null;
            })
            .map(function (feature) {
                return {
                    type: "Feature",
                    properties: feature.properties,
                    geometry: reverseGeometry(feature.geometry)
                };
            });

        const correctedGeojson = {
            type: "FeatureCollection",
            features: features
        };

        // 日本全体が枠内に収まるように自動調整
        const projection = d3
            .geoMercator()
            .fitExtent(
                [
                    [30, 30],
                    [width - 30, height - 30]
                ],
                correctedGeojson
            );

        const path = d3
            .geoPath()
            .projection(projection);

        svg
            .selectAll(".prefecture")
            .data(features)
            .enter()
            .append("path")
            .attr("class", "prefecture")
            .attr("d", path)
            .attr("fill", function (d) {
                const prefectureName = d.properties.N03_001;
                const value = publicbath[prefectureName];

                if (value !== undefined) {
                    return colorScale(value);
                }

                return "#cccccc";
            })

            // マウスを乗せたとき
            .on("mouseover", function (event, d) {
                const prefectureName = d.properties.N03_001;
                const value = publicbath[prefectureName];

                let displayValue = "データなし";

                if (value !== undefined) {
                    displayValue =
                        value.toLocaleString() + " 軒";
                }

                d3.select(this).raise();

                tooltip
                    .classed("hidden", false)
                    .html(
                        `<strong>${prefectureName}</strong><br>` +
                        `公衆浴場数: ${displayValue}`
                    );
            })

            // マウスの移動に合わせて表示位置を変更
            .on("mousemove", function (event) {
                tooltip
                    .style(
                        "top",
                        event.pageY + 10 + "px"
                    )
                    .style(
                        "left",
                        event.pageX + 10 + "px"
                    );
            })

            // マウスが離れたとき
            .on("mouseleave", function () {
                tooltip.classed("hidden", true);
            });
    })
    .catch(function (error) {
        console.error(
            "GeoJSONファイルの読み込みエラー:",
            error
        );

        document.querySelector("#map-container").innerHTML =
            "<p>地図データを読み込めませんでした。</p>";
    });