"use strict";

/* =========================================
   AnimeFinder
   - Search anime by name
   - Search anime by screenshot
   - AniList GraphQL
   - trace.moe
   - Trending / Popular / Recent
   - No VPS / No API key
========================================= */

const ANILIST_API = "https://graphql.anilist.co";
const TRACE_API = "https://api.trace.moe";

const $ = (id) => document.getElementById(id);

/* =========================================
   DOM
========================================= */

const searchInput = $("searchInput");
const searchBtn = $("searchBtn");

const imageInput = $("imageInput");
const previewImage = $("previewImage");
const uploadContent = $("uploadContent");
const traceBtn = $("traceBtn");

const results = $("results");
const animeGrid = $("animeGrid");

const traceResults = $("traceResults");
const traceGrid = $("traceGrid");

const loading = $("loading");
const loadingText = $("loadingText");

const errorBox = $("errorBox");
const errorTitle = $("errorTitle");
const errorMessage = $("errorMessage");
const closeError = $("closeError");

const emptyState = $("emptyState");

const resultTitle = $("resultTitle");
const resultCount = $("resultCount");
const resultEyebrow = $("resultEyebrow");

const animeModal = $("animeModal");
const modalOverlay = $("modalOverlay");
const modalClose = $("modalClose");
const modalContent = $("modalContent");

const githubBtn = $("githubBtn");

let selectedImage = null;

/* =========================================
   HOME SECTION
========================================= */

const homeSectionIds = [
    "trendingSection",
    "popularSection",
    "recentSection"
];

/*
 * Awalnya Home berada setelah Hero.
 * Ketika pencarian dilakukan, Home dipindahkan
 * ke bagian paling bawah setelah hasil pencarian.
 */
function moveHomeToBottom() {
    const main = document.querySelector("main");

    if (!main) return;

    homeSectionIds.forEach((id) => {
        const section = $(id);

        if (section) {
            main.appendChild(section);
        }
    });

    const homeError = $("homeError");

    if (homeError) {
        main.appendChild(homeError);
    }
}

/* =========================================
   ANILIST SEARCH
========================================= */

const SEARCH_QUERY = `
query (
    $search: String!,
    $page: Int!,
    $perPage: Int!
) {
    Page(
        page: $page,
        perPage: $perPage
    ) {
        pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
        }

        media(
            search: $search,
            type: ANIME,
            isAdult: false
        ) {
            id

            title {
                romaji
                english
                native
            }

            description(asHtml: false)

            episodes
            status
            format
            averageScore

            genres

            season
            seasonYear

            duration

            countryOfOrigin
            source

            coverImage {
                large
                extraLarge
            }

            bannerImage

            siteUrl

            studios(isMain: true) {
                nodes {
                    id
                    name
                }
            }
        }
    }
}
`;

/* =========================================
   ANILIST MULTI DETAIL
========================================= */

const MULTI_DETAIL_QUERY = `
query (
    $ids: [Int!]!
) {
    Page(
        page: 1,
        perPage: 50
    ) {
        media(
            id_in: $ids,
            type: ANIME
        ) {
            id

            title {
                romaji
                english
                native
            }

            description(asHtml: false)

            episodes
            status
            format
            averageScore

            genres

            season
            seasonYear

            duration

            countryOfOrigin
            source

            coverImage {
                large
                extraLarge
            }

            bannerImage

            siteUrl

            studios(isMain: true) {
                nodes {
                    id
                    name
                }
            }
        }
    }
}
`;

/* =========================================
   ANILIST SINGLE DETAIL
========================================= */

const DETAIL_QUERY = `
query ($id: Int!) {
    Media(
        id: $id,
        type: ANIME
    ) {
        id

        title {
            romaji
            english
            native
        }

        description(asHtml: false)

        episodes
        status
        format
        averageScore

        genres

        season
        seasonYear

        duration

        countryOfOrigin
        source

        coverImage {
            large
            extraLarge
        }

        bannerImage

        siteUrl

        studios(isMain: true) {
            nodes {
                id
                name
            }
        }
    }
}
`;

/* =========================================
   HOME QUERY
========================================= */

const HOME_QUERY = `
query {

    trending: Page(
        page: 1
        perPage: 12
    ) {
        media(
            type: ANIME
            sort: TRENDING_DESC
            isAdult: false
        ) {
            id

            title {
                romaji
                english
                native
            }

            episodes
            status
            format
            averageScore

            genres
            seasonYear

            coverImage {
                large
                extraLarge
            }

            bannerImage
            siteUrl
        }
    }

    popular: Page(
        page: 1
        perPage: 12
    ) {
        media(
            type: ANIME
            sort: POPULARITY_DESC
            isAdult: false
        ) {
            id

            title {
                romaji
                english
                native
            }

            episodes
            status
            format
            averageScore

            genres
            seasonYear

            coverImage {
                large
                extraLarge
            }

            bannerImage
            siteUrl
        }
    }

    recent: Page(
        page: 1
        perPage: 12
    ) {
        media(
            type: ANIME
            sort: UPDATED_AT_DESC
            isAdult: false
        ) {
            id

            title {
                romaji
                english
                native
            }

            episodes
            status
            format
            averageScore

            genres
            seasonYear

            coverImage {
                large
                extraLarge
            }

            bannerImage
            siteUrl
        }
    }
}
`;

/* =========================================
   TAB
========================================= */

document.querySelectorAll(".tab").forEach((tab) => {

    tab.addEventListener("click", () => {

        const type = tab.dataset.tab;

        document.querySelectorAll(".tab").forEach((x) => {
            x.classList.remove("active");
        });

        document.querySelectorAll(".search-panel").forEach((x) => {
            x.classList.remove("active");
        });

        tab.classList.add("active");

        const panel = $(
            type === "name"
                ? "namePanel"
                : "imagePanel"
        );

        if (panel) {
            panel.classList.add("active");
        }

        hideError();
    });

});

/* =========================================
   NAME SEARCH
========================================= */

if (searchBtn) {
    searchBtn.addEventListener(
        "click",
        searchAnime
    );
}

if (searchInput) {
    searchInput.addEventListener(
        "keydown",
        (event) => {

            if (event.key === "Enter") {
                event.preventDefault();
                searchAnime();
            }

        }
    );
}

async function searchAnime() {

    const query =
        searchInput?.value.trim() || "";

    if (!query) {

        showError(
            "Pencarian kosong",
            "Masukkan nama anime terlebih dahulu."
        );

        return;
    }

    /*
     * Pindahkan Trending / Popular / Recent
     * ke bawah hasil pencarian.
     */
    moveHomeToBottom();

    hideError();

    if (results) {
        results.classList.add("hidden");
    }

    if (traceResults) {
        traceResults.classList.add("hidden");
    }

    if (emptyState) {
        emptyState.classList.add("hidden");
    }

    setLoading(
        true,
        `Mencari anime "${query}"...`
    );

    try {

        const data =
            await searchAniList(query);

        const animeList =
            data?.Page?.media || [];

        renderAnimeResults(
            animeList,
            query
        );

    } catch (error) {

        console.error(error);

        showError(
            "Pencarian gagal",
            readableError(error)
        );

    } finally {

        setLoading(false);

    }
}

/* =========================================
   ANILIST REQUEST
========================================= */

async function searchAniList(query) {

    let lastError = null;

    for (
        let attempt = 1;
        attempt <= 3;
        attempt++
    ) {

        try {

            const response =
                await fetchWithTimeout(
                    ANILIST_API,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json",

                            "Accept":
                                "application/json"
                        },

                        body: JSON.stringify({
                            query:
                                SEARCH_QUERY,

                            variables: {
                                search: query,
                                page: 1,
                                perPage: 24
                            }
                        })
                    },
                    15000
                );

            const json =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    `AniList HTTP ${response.status}`
                );

            }

            if (json.errors?.length) {

                throw new Error(
                    json.errors[0]?.message ||
                    "AniList error"
                );

            }

            return json.data;

        } catch (error) {

            lastError = error;

            if (attempt < 3) {

                setLoading(
                    true,
                    `Mencoba lagi... ${attempt + 1}/3`
                );

                await sleep(
                    attempt * 900
                );

            }

        }
    }

    throw lastError;
}

/* =========================================
   RENDER NAME RESULTS
========================================= */

function renderAnimeResults(
    animes,
    query
) {

    if (!animeGrid) return;

    animeGrid.innerHTML = "";

    if (resultEyebrow) {
        resultEyebrow.textContent =
            "AniList results";
    }

    if (resultTitle) {
        resultTitle.textContent =
            `Hasil untuk "${query}"`;
    }

    if (resultCount) {
        resultCount.textContent =
            `${animes.length} anime`;
    }

    if (!animes.length) {

        showEmpty(
            "Anime tidak ditemukan",
            "Coba gunakan judul lain atau nama alternatif."
        );

        return;
    }

    animes.forEach((anime) => {

        animeGrid.appendChild(
            createAnimeCard(anime)
        );

    });

    if (results) {
        results.classList.remove(
            "hidden"
        );
    }

    scrollToElement(results);
}

/* =========================================
   ANIME CARD
========================================= */

function createAnimeCard(anime) {

    const card =
        document.createElement("article");

    card.className =
        "anime-card";

    const title =
        getTitle(anime);

    const image =
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        "";

    const score =
        getScore(
            anime.averageScore
        );

    const year =
        anime.seasonYear ||
        "N/A";

    const episodes =
        anime.episodes ??
        "?";

    const status =
        formatStatus(
            anime.status
        );

    const format =
        anime.format ||
        "N/A";

    const genres =
        Array.isArray(anime.genres)
            ? anime.genres
                .slice(0, 3)
                .join(" • ")
            : "";

    card.innerHTML = `
        <div class="poster-wrap">

            ${
                image
                    ? `
                        <img
                            class="poster"
                            src="${escapeAttr(image)}"
                            alt="${escapeAttr(title)}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="poster-placeholder">
                            No Image
                        </div>
                    `
            }

            <div class="poster-gradient"></div>

            <span class="score">
                ★ ${escapeHTML(score)}
            </span>

            ${
                anime.status
                    ? `
                        <span class="status-badge">
                            ${escapeHTML(status)}
                        </span>
                    `
                    : ""
            }

        </div>

        <div class="card-info">

            <h3 class="card-title">
                ${escapeHTML(title)}
            </h3>

            ${
                anime.title?.romaji &&
                anime.title.romaji !== title
                    ? `
                        <p class="card-romaji">
                            ${escapeHTML(
                                anime.title.romaji
                            )}
                        </p>
                    `
                    : ""
            }

            <div class="card-meta">

                <span>
                    ${escapeHTML(
                        String(year)
                    )}
                </span>

                <i>•</i>

                <span>
                    ${escapeHTML(
                        String(episodes)
                    )} eps
                </span>

                <i>•</i>

                <span>
                    ${escapeHTML(format)}
                </span>

            </div>

            ${
                genres
                    ? `
                        <div class="card-genres">
                            ${escapeHTML(
                                genres
                            )}
                        </div>
                    `
                    : ""
            }

        </div>
    `;

    const poster =
        card.querySelector(".poster");

    if (poster) {

        poster.addEventListener(
            "error",
            () => {

                poster.style.display =
                    "none";

                const placeholder =
                    document.createElement(
                        "div"
                    );

                placeholder.className =
                    "poster-placeholder";

                placeholder.textContent =
                    "No Image";

                poster.parentNode.prepend(
                    placeholder
                );

            }
        );

    }

    card.addEventListener(
        "click",
        () => {
            showAnimeDetail(anime);
        }
    );

    return card;
}

/* =========================================
   IMAGE SELECT
========================================= */

if (imageInput) {

    imageInput.addEventListener(
        "change",
        handleImageSelect
    );

}

function handleImageSelect() {

    const file =
        imageInput?.files?.[0];

    if (!file) {

        resetImage();

        return;
    }

    hideError();

    if (!file.type.startsWith("image/")) {

        showError(
            "File tidak valid",
            "Pilih gambar JPG, PNG, WEBP, atau GIF."
        );

        resetImage();

        return;
    }

    if (
        file.size >
        12 * 1024 * 1024
    ) {

        showError(
            "Gambar terlalu besar",
            "Ukuran screenshot maksimal 12 MB."
        );

        resetImage();

        return;
    }

    selectedImage = file;

    const reader =
        new FileReader();

    reader.onload = (event) => {

        if (previewImage) {

            previewImage.src =
                String(
                    event.target?.result ||
                    ""
                );

            previewImage.style.display =
                "block";
        }

        if (uploadContent) {

            uploadContent.style.display =
                "none";
        }

        if (traceBtn) {

            traceBtn.disabled =
                false;
        }

    };

    reader.onerror = () => {

        showError(
            "Gagal membaca gambar",
            "Coba pilih screenshot lain."
        );

        resetImage();

    };

    reader.readAsDataURL(file);
}

/* =========================================
   TRACE SEARCH
========================================= */

if (traceBtn) {

    traceBtn.addEventListener(
        "click",
        searchByImage
    );

}

async function searchByImage() {

    if (!selectedImage) {

        showError(
            "Gambar belum dipilih",
            "Upload screenshot anime terlebih dahulu."
        );

        return;
    }

    /*
     * Pindahkan Home ke bawah sebelum
     * hasil pencarian gambar ditampilkan.
     */
    moveHomeToBottom();

    hideError();

    if (results) {

        results.classList.add(
            "hidden"
        );

    }

    if (traceResults) {

        traceResults.classList.add(
            "hidden"
        );

    }

    if (emptyState) {

        emptyState.classList.add(
            "hidden"
        );

    }

    setLoading(
        true,
        "Menganalisis screenshot..."
    );

    try {

        const formData =
            new FormData();

        formData.append(
            "image",
            selectedImage,
            selectedImage.name
        );

        const url =
            `${TRACE_API}/search` +
            `?anilistInfo=true` +
            `&cutBorders=true`;

        const response =
            await fetchWithTimeout(
                url,
                {
                    method: "POST",
                    body: formData
                },
                35000
            );

        const json =
            await response.json();

        if (!response.ok) {

            throw new Error(
                json.error ||
                `trace.moe HTTP ${response.status}`
            );

        }

        if (
            json.error &&
            String(json.error).trim()
        ) {

            throw new Error(
                json.error
            );

        }

        let items =
            Array.isArray(json.result)
                ? json.result
                : [];

        if (!items.length) {

            showEmpty(
                "Anime tidak ditemukan",
                "Screenshot tidak memiliki adegan yang cocok."
            );

            return;
        }

        items.sort(
            (a, b) =>
                (b.similarity || 0) -
                (a.similarity || 0)
        );

        items =
            items.slice(0, 10);

        setLoading(
            true,
            "Mengambil nama anime..."
        );

        const enriched =
            await enrichTraceResults(
                items
            );

        renderTraceResults(
            enriched
        );

    } catch (error) {

        console.error(
            "trace.moe error:",
            error
        );

        showError(
            "Pencarian gambar gagal",
            readableTraceError(error)
        );

    } finally {

        setLoading(false);

    }
}

/* =========================================
   ENRICH TRACE RESULTS
========================================= */

async function enrichTraceResults(
    items
) {

    const ids =
        [
            ...new Set(
                items
                    .map(
                        (item) =>
                            Number(
                                item.anilist?.id ||
                                item.anilist_id ||
                                0
                            )
                    )
                    .filter(
                        (id) =>
                            Number.isInteger(id) &&
                            id > 0
                    )
            )
        ];

    if (!ids.length) {
        return items;
    }

    try {

        const animeList =
            await getAnimeByIds(ids);

        const map =
            new Map();

        animeList.forEach(
            (anime) => {

                map.set(
                    Number(anime.id),
                    anime
                );

            }
        );

        return items.map(
            (item) => {

                const id =
                    Number(
                        item.anilist?.id ||
                        item.anilist_id ||
                        0
                    );

                const anime =
                    map.get(id);

                if (!anime) {
                    return item;
                }

                return {
                    ...item,

                    animeData:
                        anime,

                    anilist: {
                        ...(item.anilist || {}),

                        id:
                            anime.id,

                        title:
                            anime.title,

                        description:
                            anime.description,

                        episodes:
                            anime.episodes,

                        status:
                            anime.status,

                        format:
                            anime.format,

                        averageScore:
                            anime.averageScore,

                        genres:
                            anime.genres,

                        season:
                            anime.season,

                        seasonYear:
                            anime.seasonYear,

                        duration:
                            anime.duration,

                        coverImage:
                            anime.coverImage,

                        bannerImage:
                            anime.bannerImage,

                        siteUrl:
                            anime.siteUrl,

                        studios:
                            anime.studios
                    }
                };

            }
        );

    } catch (error) {

        console.warn(
            "AniList enrichment gagal:",
            error
        );

        return items;
    }
}

/* =========================================
   GET MULTIPLE ANIME
========================================= */

async function getAnimeByIds(
    ids
) {

    const response =
        await fetchWithTimeout(
            ANILIST_API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify({
                    query:
                        MULTI_DETAIL_QUERY,

                    variables: {
                        ids
                    }
                })
            },
            15000
        );

    const json =
        await response.json();

    if (!response.ok) {

        throw new Error(
            `AniList HTTP ${response.status}`
        );

    }

    if (json.errors?.length) {

        throw new Error(
            json.errors[0]?.message ||
            "AniList error"
        );

    }

    return (
        json.data?.Page?.media ||
        []
    );
}

/* =========================================
   TRACE RESULTS
========================================= */

function renderTraceResults(
    items
) {

    if (!traceGrid) return;

    traceGrid.innerHTML = "";

    if (!items.length) {

        showEmpty(
            "Anime tidak ditemukan",
            "Tidak ada hasil yang cocok."
        );

        return;
    }

    if (resultEyebrow) {

        resultEyebrow.textContent =
            "Image search";
    }

    if (resultTitle) {

        resultTitle.textContent =
            "Anime yang ditemukan";
    }

    if (resultCount) {

        resultCount.textContent =
            `${items.length} hasil`;
    }

    items.forEach(
        (item) => {

            traceGrid.appendChild(
                createTraceCard(item)
            );

        }
    );

    if (traceResults) {

        traceResults.classList.remove(
            "hidden"
        );

    }

    scrollToElement(
        traceResults
    );
}

/* =========================================
   TRACE CARD
========================================= */

function createTraceCard(item) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "trace-card";

    const anime =
        item.animeData ||
        item.anilist ||
        {};

    const title =
        getTitle(anime) !==
        "Unknown Anime"
            ? getTitle(anime)
            : (
                item.title ||
                "Anime tidak diketahui"
            );

    const romaji =
        anime.title?.romaji ||
        "";

    const native =
        anime.title?.native ||
        "";

    const image =
        item.image ||
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        previewImage?.src ||
        "";

    const episode =
        item.episode ??
        "N/A";

    const similarity =
        typeof item.similarity ===
        "number"
            ? (
                item.similarity *
                100
            ).toFixed(1) + "%"
            : "N/A";

    const from =
        formatTime(
            item.from
        );

    const to =
        formatTime(
            item.to
        );

    const video =
        item.video ||
        "";

    const anilistId =
        Number(
            anime.id ||
            item.anilist?.id ||
            item.anilist_id ||
            0
        );

    const score =
        getScore(
            anime.averageScore
        );

    const year =
        anime.seasonYear ||
        "N/A";

    const genres =
        Array.isArray(
            anime.genres
        )
            ? anime.genres
                .slice(0, 3)
                .join(" • ")
            : "";

    card.innerHTML = `
        <div class="trace-image-wrap">

            ${
                image
                    ? `
                        <img
                            src="${escapeAttr(image)}"
                            alt="${escapeAttr(title)}"
                            loading="lazy"
                        >
                    `
                    : `
                        <div class="trace-no-image">
                            No Image
                        </div>
                    `
            }

            <div class="trace-match">
                ${escapeHTML(
                    similarity
                )}
            </div>

        </div>

        <div class="trace-info">

            <div class="trace-topline">

                <span>
                    SCREENSHOT MATCH
                </span>

                ${
                    anime.averageScore
                        ? `
                            <b>
                                ★ ${escapeHTML(score)}
                            </b>
                        `
                        : ""
                }

            </div>

            <h3>
                ${escapeHTML(title)}
            </h3>

            ${
                romaji &&
                romaji !== title
                    ? `
                        <p class="trace-alt-title">
                            ${escapeHTML(
                                romaji
                            )}
                        </p>
                    `
                    : ""
            }

            ${
                native &&
                native !== title &&
                native !== romaji
                    ? `
                        <p class="trace-native-title">
                            ${escapeHTML(
                                native
                            )}
                        </p>
                    `
                    : ""
            }

            <div class="trace-details">

                <div>

                    <span>
                        Episode
                    </span>

                    <strong>
                        ${escapeHTML(
                            String(episode)
                        )}
                    </strong>

                </div>

                <div>

                    <span>
                        Timestamp
                    </span>

                    <strong>
                        ${escapeHTML(
                            from
                        )}
                        -
                        ${escapeHTML(
                            to
                        )}
                    </strong>

                </div>

                <div>

                    <span>
                        Year
                    </span>

                    <strong>
                        ${escapeHTML(
                            String(year)
                        )}
                    </strong>

                </div>

            </div>

            ${
                genres
                    ? `
                        <div class="trace-genres">
                            ${escapeHTML(
                                genres
                            )}
                        </div>
                    `
                    : ""
            }

            <div class="trace-actions">

                ${
                    anilistId
                        ? `
                            <button
                                type="button"
                                class="trace-detail-btn"
                                data-id="${anilistId}"
                            >
                                Detail Anime
                            </button>
                        `
                        : ""
                }

                ${
                    video
                        ? `
                            <a
                                class="trace-video-btn"
                                href="${escapeAttr(video)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Preview Scene
                            </a>
                        `
                        : ""
                }

            </div>

        </div>
    `;

    const detailButton =
        card.querySelector(
            ".trace-detail-btn"
        );

    if (detailButton) {

        detailButton.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();

                const id =
                    Number(
                        detailButton.dataset.id
                    );

                if (id) {
                    showAnimeById(id);
                }

            }
        );

    }

    const videoButton =
        card.querySelector(
            ".trace-video-btn"
        );

    if (videoButton) {

        videoButton.addEventListener(
            "click",
            (event) => {
                event.stopPropagation();
            }
        );

    }

    card.addEventListener(
        "click",
        () => {

            if (anilistId) {

                showAnimeById(
                    anilistId
                );

            }

        }
    );

    return card;
}

/* =========================================
   ANIME DETAIL
========================================= */

async function showAnimeById(
    id
) {

    hideError();

    setLoading(
        true,
        "Mengambil detail anime..."
    );

    try {

        const anime =
            await getAnimeById(id);

        showAnimeDetail(anime);

    } catch (error) {

        console.error(error);

        showError(
            "Gagal mengambil detail",
            readableError(error)
        );

    } finally {

        setLoading(false);

    }
}

async function getAnimeById(
    id
) {

    const response =
        await fetchWithTimeout(
            ANILIST_API,
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body: JSON.stringify({
                    query:
                        DETAIL_QUERY,

                    variables: {
                        id: Number(id)
                    }
                })
            },
            15000
        );

    const json =
        await response.json();

    if (!response.ok) {

        throw new Error(
            `AniList HTTP ${response.status}`
        );

    }

    if (json.errors?.length) {

        throw new Error(
            json.errors[0]?.message ||
            "AniList error"
        );

    }

    const anime =
        json.data?.Media;

    if (!anime) {

        throw new Error(
            "Anime tidak ditemukan."
        );

    }

    return anime;
}

/* =========================================
   DETAIL MODAL
========================================= */

function showAnimeDetail(
    anime
) {

    if (
        !animeModal ||
        !modalContent
    ) {
        return;
    }

    const title =
        getTitle(anime);

    const image =
        anime.coverImage?.extraLarge ||
        anime.coverImage?.large ||
        "";

    const description =
        cleanDescription(
            anime.description
        ) ||
        "Sinopsis tidak tersedia.";

    const score =
        getScore(
            anime.averageScore
        );

    const genres =
        anime.genres?.join(", ") ||
        "N/A";

    const studios =
        anime.studios?.nodes
            ?.map(
                (studio) =>
                    studio.name
            )
            .join(", ") ||
        "N/A";

    modalContent.innerHTML = `
        <div class="modal-content">

            <div class="modal-poster-column">

                ${
                    image
                        ? `
                            <img
                                class="modal-poster"
                                src="${escapeAttr(image)}"
                                alt="${escapeAttr(title)}"
                            >
                        `
                        : `
                            <div class="modal-poster-empty">
                                No Image
                            </div>
                        `
                }

            </div>

            <div class="modal-details">

                <span class="modal-eyebrow">
                    Anime details
                </span>

                <h2>
                    ${escapeHTML(title)}
                </h2>

                ${
                    anime.title?.native
                        ? `
                            <p class="modal-native">
                                ${escapeHTML(
                                    anime.title.native
                                )}
                            </p>
                        `
                        : ""
                }

                <div class="modal-stats">

                    ${createStat(
                        "Rating",
                        score
                    )}

                    ${createStat(
                        "Episode",
                        anime.episodes ??
                        "N/A"
                    )}

                    ${createStat(
                        "Status",
                        formatStatus(
                            anime.status
                        )
                    )}

                    ${createStat(
                        "Format",
                        anime.format ||
                        "N/A"
                    )}

                    ${createStat(
                        "Tahun",
                        anime.seasonYear ||
                        "N/A"
                    )}

                    ${createStat(
                        "Durasi",
                        anime.duration
                            ? `${anime.duration} min`
                            : "N/A"
                    )}

                    ${createStat(
                        "Genre",
                        genres
                    )}

                    ${createStat(
                        "Studio",
                        studios
                    )}

                </div>

                <h4 class="modal-section-title">
                    Sinopsis
                </h4>

                <p class="modal-description">
                    ${escapeHTML(
                        description
                    )}
                </p>

                ${
                    anime.siteUrl
                        ? `
                            <a
                                class="modal-link"
                                href="${escapeAttr(
                                    anime.siteUrl
                                )}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Buka AniList ↗
                            </a>
                        `
                        : ""
                }

            </div>

        </div>
    `;

    animeModal.classList.remove(
        "hidden"
    );

    animeModal.setAttribute(
        "aria-hidden",
        "false"
    );

    document.body.classList.add(
        "modal-open"
    );
}

function createStat(
    label,
    value
) {

    return `
        <div class="stat">

            <span>
                ${escapeHTML(
                    String(label)
                )}
            </span>

            <strong>
                ${escapeHTML(
                    String(value)
                )}
            </strong>

        </div>
    `;
}

/* =========================================
   MODAL EVENTS
========================================= */

if (modalClose) {

    modalClose.addEventListener(
        "click",
        closeModal
    );

}

if (modalOverlay) {

    modalOverlay.addEventListener(
        "click",
        closeModal
    );

}

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            animeModal &&
            !animeModal.classList.contains(
                "hidden"
            )
        ) {
            closeModal();
        }

    }
);

function closeModal() {

    if (animeModal) {

        animeModal.classList.add(
            "hidden"
        );

        animeModal.setAttribute(
            "aria-hidden",
            "true"
        );

    }

    document.body.classList.remove(
        "modal-open"
    );
}

/* =========================================
   EMPTY STATE
========================================= */

function showEmpty(
    title,
    message
) {

    if (!emptyState) return;

    const h2 =
        emptyState.querySelector(
            "h2"
        );

    const p =
        emptyState.querySelector(
            "p"
        );

    if (h2) {
        h2.textContent =
            title;
    }

    if (p) {
        p.textContent =
            message;
    }

    emptyState.classList.remove(
        "hidden"
    );

    scrollToElement(
        emptyState
    );
}

/* =========================================
   LOADING
========================================= */

function setLoading(
    active,
    text = "Memuat..."
) {

    if (!loading) return;

    if (active) {

        if (loadingText) {

            loadingText.textContent =
                text;
        }

        loading.classList.remove(
            "hidden"
        );

    } else {

        loading.classList.add(
            "hidden"
        );

    }
}

/* =========================================
   ERROR
========================================= */

function showError(
    title,
    message
) {

    if (!errorBox) return;

    if (errorTitle) {

        errorTitle.textContent =
            title;
    }

    if (errorMessage) {

        errorMessage.textContent =
            message;
    }

    errorBox.classList.remove(
        "hidden"
    );
}

function hideError() {

    if (errorBox) {

        errorBox.classList.add(
            "hidden"
        );

    }
}

if (closeError) {

    closeError.addEventListener(
        "click",
        hideError
    );

}

/* =========================================
   RESET IMAGE
========================================= */

function resetImage() {

    selectedImage = null;

    if (imageInput) {
        imageInput.value = "";
    }

    if (previewImage) {

        previewImage.src = "";

        previewImage.style.display =
            "none";
    }

    if (uploadContent) {

        uploadContent.style.display =
            "block";
    }

    if (traceBtn) {

        traceBtn.disabled =
            true;
    }
}

/* =========================================
   HELPERS
========================================= */

function getTitle(anime) {

    return (
        anime?.title?.english ||
        anime?.title?.romaji ||
        anime?.title?.native ||
        "Unknown Anime"
    );
}

function getScore(score) {

    if (
        typeof score !== "number" ||
        !Number.isFinite(score)
    ) {
        return "N/A";
    }

    return (
        score / 10
    ).toFixed(1);
}

function formatStatus(
    status
) {

    const map = {

        FINISHED:
            "Finished",

        RELEASING:
            "Airing",

        NOT_YET_RELEASED:
            "Upcoming",

        CANCELLED:
            "Cancelled",

        HIATUS:
            "Hiatus"

    };

    return (
        map[status] ||
        status ||
        "N/A"
    );
}

function cleanDescription(
    text
) {

    if (!text) return "";

    return String(text)

        .replace(
            /<br\s*\/?>/gi,
            "\n"
        )

        .replace(
            /<[^>]*>/g,
            ""
        )

        .replace(
            /\n{3,}/g,
            "\n\n"
        )

        .trim();
}

function formatTime(
    seconds
) {

    if (
        typeof seconds !== "number" ||
        !Number.isFinite(seconds)
    ) {
        return "N/A";
    }

    const total =
        Math.max(
            0,
            Math.floor(seconds)
        );

    const hours =
        Math.floor(
            total / 3600
        );

    const minutes =
        Math.floor(
            (total % 3600) / 60
        );

    const secs =
        total % 60;

    if (hours > 0) {

        return `${hours}:${String(
            minutes
        ).padStart(2, "0")}:${String(
            secs
        ).padStart(2, "0")}`;
    }

    return `${minutes}:${String(
        secs
    ).padStart(2, "0")}`;
}

function escapeHTML(value) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );
}

function escapeAttr(value) {

    return escapeHTML(value);
}

function sleep(ms) {

    return new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                ms
            )
    );
}

async function fetchWithTimeout(
    url,
    options = {},
    timeout = 15000
) {

    const controller =
        new AbortController();

    const timer =
        setTimeout(
            () => controller.abort(),
            timeout
        );

    try {

        return await fetch(
            url,
            {
                ...options,
                signal:
                    controller.signal
            }
        );

    } finally {

        clearTimeout(timer);

    }
}

function readableError(
    error
) {

    const message =
        String(
            error?.message ||
            ""
        );

    if (
        message.includes(
            "AbortError"
        )
    ) {

        return "Request terlalu lama. Coba lagi.";
    }

    if (
        message.includes("429")
    ) {

        return "Terlalu banyak request. Tunggu sebentar.";
    }

    if (
        error instanceof TypeError
    ) {

        return "Tidak dapat terhubung ke AniList. Periksa koneksi internet.";
    }

    return (
        message ||
        "Terjadi kesalahan. Coba lagi."
    );
}

function readableTraceError(
    error
) {

    const message =
        String(
            error?.message ||
            ""
        );

    if (
        message.includes(
            "AbortError"
        )
    ) {

        return "Analisis screenshot terlalu lama. Coba gambar yang lebih kecil.";
    }

    if (
        message.includes("429")
    ) {

        return "Terlalu banyak pencarian gambar. Tunggu sebentar.";
    }

    if (
        message.includes("413")
    ) {

        return "Ukuran screenshot terlalu besar.";
    }

    if (
        error instanceof TypeError
    ) {

        return "Tidak dapat terhubung ke trace.moe.";
    }

    return (
        message ||
        "Screenshot tidak dapat dianalisis."
    );
}

function scrollToElement(
    element
) {

    if (!element) return;

    setTimeout(
        () => {

            element.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

        },
        100
    );
}

/* =========================================
   GITHUB
========================================= */

if (githubBtn) {

    githubBtn.addEventListener(
        "click",
        () => {

            window.open(
                "https://github.com/xenoz69-art",
                "_blank",
                "noopener,noreferrer"
            );

        }
    );

}

/* =========================================
   HOME — LOAD DATA
========================================= */

async function loadHomeAnime() {

    try {

        const response =
            await fetchWithTimeout(
                ANILIST_API,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"
                    },

                    body: JSON.stringify({
                        query:
                            HOME_QUERY
                    })
                },
                15000
            );

        const json =
            await response.json();

        if (!response.ok) {

            throw new Error(
                `AniList HTTP ${response.status}`
            );

        }

        if (json.errors?.length) {

            throw new Error(
                json.errors[0]?.message ||
                "AniList error"
            );

        }

        renderHomeSection(
            "trendingGrid",
            json.data?.trending?.media || []
        );

        renderHomeSection(
            "popularGrid",
            json.data?.popular?.media || []
        );

        renderHomeSection(
            "recentGrid",
            json.data?.recent?.media || []
        );

    } catch (error) {

        console.error(
            "Home Anime:",
            error
        );

        const homeError =
            $("homeError");

        if (homeError) {

            homeError.classList.remove(
                "hidden"
            );

        }

    }
}

/* =========================================
   HOME CARD RENDER
========================================= */

function renderHomeSection(
    gridId,
    animeList
) {

    const grid =
        $(gridId);

    if (!grid) return;

    grid.innerHTML = "";

    animeList.forEach(
        (anime) => {

            /*
             * createAnimeCard() sudah mempunyai
             * event click untuk membuka detail.
             * Tidak perlu event click kedua.
             */
            grid.appendChild(
                createAnimeCard(anime)
            );

        }
    );
}

/* =========================================
   START HOME
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadHomeAnime();

    }
);