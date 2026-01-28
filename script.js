// 遊戯王 2Pick シミュレーター
// YGOPRODeck API (画像) + Yugipedia API (日本語テキスト)

// State Management
const state = {
    allCards: [],
    mainDeckCards: [],
    exDeckCards: [],
    filteredMainCards: [],
    filteredExCards: [],
    cardSets: [],
    cardSetsList: [],  // パックリスト
    japaneseCache: {},
    csvCards: [],  // CSVからアップロードされたカード
    csvMainCards: [],  // CSV カード（メインデッキ用）
    csvExCards: [],  // CSV カード（EXデッキ用）
    csvPendingIdentifiers: null,  // カードデータ読み込み前のCSV識別子
    settings: {
        pickMode: 'attribute-race',
        cardsPerPick: 6,
        cardsPerBlock: 2,  // ブロックあたりのカード枚数
        mainDeckSize: 40,
        exDeckSize: 15,
        releaseDate: null,
        selectedAttributes: [],
        selectedRaces: []
    },
    // ピック状態
    currentPhase: 'main',
    currentPick: 0,
    mainPicks: 0,
    exPicks: 0,
    selectedMainCards: [],
    selectedExCards: [],
    currentOptions: [],
    // アーキタイプモード用
    pickedArchetypes: {},  // { archetype: count }
    currentArchetypeFocus: null,
    // パックモード用
    currentPack: null,
    focusPack: null,  // 最初に選んだカードのパック
    // カード枚数制限用
    pickedCardCounts: {}  // { cardId: count } 同じカードは3枚まで
};

// モード説明
const modeDescriptions = {
    'random': '完全にランダムにカードが出現します',
    'archetype': '選んだカードと同じアーキタイプのカードが出やすくなります',
    'pack': '最初に選んだカードのパックから80%の確率で出現します',
    'attribute-race': '指定した属性・種族のモンスターが出現します',
    'csv': 'CSVファイルでアップロードしたカードのみが出現します'
};

// 種族の日本語マップ
const raceJapaneseMap = {
    'Dragon': 'ドラゴン族',
    'Spellcaster': '魔法使い族',
    'Warrior': '戦士族',
    'Machine': '機械族',
    'Fiend': '悪魔族',
    'Fairy': '天使族',
    'Zombie': 'アンデット族',
    'Beast': '獣族',
    'Beast-Warrior': '獣戦士族',
    'Winged Beast': '鳥獣族',
    'Dinosaur': '恐竜族',
    'Insect': '昆虫族',
    'Plant': '植物族',
    'Aqua': '水族',
    'Fish': '魚族',
    'Sea Serpent': '海竜族',
    'Reptile': '爬虫類族',
    'Pyro': '炎族',
    'Thunder': '雷族',
    'Rock': '岩石族',
    'Psychic': 'サイキック族',
    'Wyrm': '幻竜族',
    'Cyberse': 'サイバース族',
    'Divine-Beast': '幻神獣族'
};

// 属性の日本語マップ
const attributeJapaneseMap = {
    'DARK': '闇属性',
    'LIGHT': '光属性',
    'EARTH': '地属性',
    'WATER': '水属性',
    'FIRE': '炎属性',
    'WIND': '風属性',
    'DIVINE': '神属性'
};

// EXデッキモンスターの判定
function isExtraDeckCard(card) {
    const type = card.type.toLowerCase();
    return type.includes('fusion') ||
           type.includes('synchro') ||
           type.includes('xyz') ||
           type.includes('link');
}

// DOM Elements
const elements = {
    settingsScreen: document.getElementById('settings-screen'),
    pickScreen: document.getElementById('pick-screen'),
    resultScreen: document.getElementById('result-screen'),

    pickMode: document.getElementById('pick-mode'),
    modeDescription: document.getElementById('mode-description'),
    attributeRaceSettings: document.getElementById('attribute-race-settings'),
    attributeCheckboxes: document.getElementById('attribute-checkboxes'),
    raceCheckboxes: document.getElementById('race-checkboxes'),
    csvSettings: document.getElementById('csv-settings'),
    csvDropArea: document.getElementById('csv-drop-area'),
    csvFile: document.getElementById('csv-file'),
    csvFileName: document.getElementById('csv-file-name'),
    csvStatus: document.getElementById('csv-status'),
    cardsPerPick: document.getElementById('cards-per-pick'),
    cardsPerBlock: document.getElementById('cards-per-block'),
    blockInfo: document.getElementById('block-info'),
    mainDeckSize: document.getElementById('main-deck-size'),
    exDeckSize: document.getElementById('ex-deck-size'),
    releaseDate: document.getElementById('release-date'),
    mainPicks: document.getElementById('main-picks'),
    mainPickRounds: document.getElementById('main-pick-rounds'),
    exPicks: document.getElementById('ex-picks'),
    exPickRounds: document.getElementById('ex-pick-rounds'),
    startBtn: document.getElementById('start-btn'),
    loadingStatus: document.getElementById('loading-status'),

    deckTypeIndicator: document.getElementById('deck-type-indicator'),
    pickContext: document.getElementById('pick-context'),
    pickInstruction: document.getElementById('pick-instruction'),
    currentPickDisplay: document.getElementById('current-pick'),
    totalPickDisplay: document.getElementById('total-pick-display'),
    cardsGained: document.getElementById('cards-gained'),
    cardsContainer: document.getElementById('cards-container'),
    backToSettings: document.getElementById('back-to-settings'),

    mainDeckCount: document.getElementById('main-deck-count'),
    mainMonsterCount: document.getElementById('main-monster-count'),
    mainSpellCount: document.getElementById('main-spell-count'),
    mainTrapCount: document.getElementById('main-trap-count'),
    mainMonsterCards: document.getElementById('main-monster-cards'),
    mainSpellCards: document.getElementById('main-spell-cards'),
    mainTrapCards: document.getElementById('main-trap-cards'),

    exDeckSection: document.getElementById('ex-deck-section'),
    exDeckCount: document.getElementById('ex-deck-count'),
    exDeckCards: document.getElementById('ex-deck-cards'),

    retryBtn: document.getElementById('retry-btn'),
    newSettingsBtn: document.getElementById('new-settings-btn'),
    exportYdkBtn: document.getElementById('export-ydk-btn'),
    exportTextBtn: document.getElementById('export-text-btn'),

    modal: document.getElementById('card-modal'),
    modalOverlay: document.querySelector('.modal-overlay'),
    modalClose: document.querySelector('.modal-close'),
    modalImage: document.getElementById('modal-card-image'),
    modalName: document.getElementById('modal-card-name'),
    modalType: document.getElementById('modal-card-type'),
    modalStats: document.getElementById('modal-card-stats'),
    modalDesc: document.getElementById('modal-card-desc'),
    modalCloseBtn: document.getElementById('modal-close-btn')
};

let currentModalCard = null;
let jsonpCallbackId = 0;

// API Functions
async function fetchAllCards() {
    const response = await fetch('https://db.ygoprodeck.com/api/v7/cardinfo.php');
    if (!response.ok) throw new Error('Failed to fetch cards');
    const data = await response.json();
    return data.data;
}

async function fetchCardSets() {
    const response = await fetch('https://db.ygoprodeck.com/api/v7/cardsets.php');
    if (!response.ok) throw new Error('Failed to fetch card sets');
    return await response.json();
}

// Yugipedia JSONP
function fetchJapaneseData(englishName) {
    return new Promise((resolve) => {
        if (state.japaneseCache[englishName]) {
            resolve(state.japaneseCache[englishName]);
            return;
        }

        const callbackName = `yugipediaCallback_${++jsonpCallbackId}`;
        const encodedName = encodeURIComponent(englishName);

        const timeout = setTimeout(() => { cleanup(); resolve(null); }, 5000);

        window[callbackName] = function(data) {
            cleanup();
            try {
                const results = data.query?.results;
                if (results && Object.keys(results).length > 0) {
                    const firstResult = Object.values(results)[0];
                    const printouts = firstResult.printouts;
                    const japaneseData = {
                        japaneseName: cleanRubyText(printouts['Japanese name']?.[0] || ''),
                        japaneseLore: printouts['Japanese lore']?.[0] || '',
                        cardType: printouts['Card type']?.[0] || ''
                    };
                    state.japaneseCache[englishName] = japaneseData;
                    resolve(japaneseData);
                    return;
                }
            } catch (e) {}
            resolve(null);
        };

        function cleanup() {
            clearTimeout(timeout);
            delete window[callbackName];
            const script = document.getElementById(callbackName);
            if (script) script.remove();
        }

        const script = document.createElement('script');
        script.id = callbackName;
        script.src = `https://yugipedia.com/api.php?action=ask&query=[[English%20name::${encodedName}]]|?Japanese%20name|?Japanese%20lore|?Card%20type&format=json&callback=${callbackName}`;
        script.onerror = () => { cleanup(); resolve(null); };
        document.body.appendChild(script);
    });
}

function cleanRubyText(text) {
    if (!text) return '';
    return text
        .replace(/<ruby[^>]*><rb>([^<]*)<\/rb><rp>[^<]*<\/rp><rt>[^<]*<\/rt><rp>[^<]*<\/rp><\/ruby>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .trim();
}

// HTMLタグを安全にレンダリングする（許可されたタグのみ）
function sanitizeHtml(text) {
    if (!text) return '';
    // まずエスケープ
    let escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

    // 許可するタグを戻す（<br>のみ）
    escaped = escaped
        .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
        .replace(/&lt;\/br&gt;/gi, '<br>');

    // 改行文字も<br>に変換
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
}

function filterCardsByDate(cards, maxDate) {
    if (!maxDate) return cards;
    const maxDateTime = new Date(maxDate).getTime();
    return cards.filter(card => {
        if (!card.card_sets || card.card_sets.length === 0) return false;
        return card.card_sets.some(set => {
            const setInfo = state.cardSets.find(s => s.set_name === set.set_name);
            if (!setInfo || !setInfo.tcg_date) return false;
            return new Date(setInfo.tcg_date).getTime() <= maxDateTime;
        });
    });
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getCardType(card) {
    // カスタムカードはモンスター扱い
    if (card.isCustomCard) return 'monster';
    const type = card.type.toLowerCase();
    if (type.includes('monster')) return 'monster';
    if (type.includes('spell')) return 'spell';
    if (type.includes('trap')) return 'trap';
    return 'monster';  // 不明なタイプもモンスター扱い
}

function getCardTypeJapanese(card) {
    const type = card.type.toLowerCase();
    if (type.includes('fusion')) return '融合モンスター';
    if (type.includes('synchro')) return 'シンクロモンスター';
    if (type.includes('xyz')) return 'エクシーズモンスター';
    if (type.includes('link')) return 'リンクモンスター';
    if (type.includes('ritual')) return '儀式モンスター';
    if (type.includes('pendulum') && type.includes('effect')) return 'ペンデュラム・効果モンスター';
    if (type.includes('pendulum') && type.includes('normal')) return 'ペンデュラム・通常モンスター';
    if (type.includes('normal monster')) return '通常モンスター';
    if (type.includes('effect monster')) return '効果モンスター';
    if (type.includes('monster')) return 'モンスター';
    if (type.includes('spell')) return '魔法カード';
    if (type.includes('trap')) return '罠カード';
    return card.type;
}

function getCardImageUrl(cardId, small = false) {
    const folder = small ? 'cards_small' : 'cards';
    return `https://images.ygoprodeck.com/images/${folder}/${cardId}.jpg`;
}

// カード枚数制限（同じカードは3枚まで）
function filterAvailableCards(cardPool) {
    return cardPool.filter(card => {
        const count = state.pickedCardCounts[card.id] || 0;
        return count < 3;
    });
}

function updatePickedCardCount(card) {
    state.pickedCardCounts[card.id] = (state.pickedCardCounts[card.id] || 0) + 1;
}

// アーキタイプ関連
function getCardArchetypes(card) {
    return card.archetype ? [card.archetype] : [];
}

function updatePickedArchetypes(card) {
    const archetypes = getCardArchetypes(card);
    archetypes.forEach(arch => {
        state.pickedArchetypes[arch] = (state.pickedArchetypes[arch] || 0) + 1;
    });
}

function getTopArchetypes(count = 3) {
    const sorted = Object.entries(state.pickedArchetypes)
        .sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, count).map(([arch]) => arch);
}

// カード選出ロジック
function selectCardsForPick(cardPool, count) {
    const mode = state.settings.pickMode;

    if (mode === 'random') {
        return selectRandomCards(cardPool, count);
    } else if (mode === 'archetype') {
        return selectArchetypeCards(cardPool, count);
    } else if (mode === 'pack') {
        return selectPackCards(cardPool, count);
    } else if (mode === 'attribute-race') {
        return selectAttributeRaceCards(cardPool, count);
    } else if (mode === 'csv') {
        return selectCsvCards(cardPool, count);
    }

    return selectRandomCards(cardPool, count);
}

// CSVモード: アップロードされたカードからランダムに選出
function selectCsvCards(cardPool, count) {
    state.currentArchetypeFocus = null;
    state.currentPack = null;

    // CSVカードプールを使用（メイン/EXはshowNextPickで切り替え済み）
    const csvPool = state.currentPhase === 'main' ? state.csvMainCards : state.csvExCards;

    // 3枚制限を適用
    const availableCards = filterAvailableCards(csvPool);

    // 重複を除去してシャッフル
    const uniqueCards = [...new Map(availableCards.map(c => [c.id, c])).values()];
    const shuffled = shuffleArray(uniqueCards);
    return shuffled.slice(0, count);
}

function selectRandomCards(cardPool, count) {
    state.currentArchetypeFocus = null;
    state.currentPack = null;
    // 重複を除去してシャッフル
    const uniqueCards = [...new Map(cardPool.map(c => [c.id, c])).values()];
    const shuffled = shuffleArray(uniqueCards);
    return shuffled.slice(0, count);
}

function selectArchetypeCards(cardPool, count) {
    const topArchetypes = getTopArchetypes(3);

    // 重複を除去
    const uniquePool = [...new Map(cardPool.map(c => [c.id, c])).values()];

    // 最初の数ピックはランダム
    if (Object.keys(state.pickedArchetypes).length < 2) {
        state.currentArchetypeFocus = null;
        const shuffled = shuffleArray(uniquePool);
        return shuffled.slice(0, count);
    }

    // 60%の確率でアーキタイプ重視
    if (Math.random() < 0.6 && topArchetypes.length > 0) {
        const focusArchetype = topArchetypes[Math.floor(Math.random() * Math.min(2, topArchetypes.length))];
        state.currentArchetypeFocus = focusArchetype;

        // そのアーキタイプのカードを優先
        const archetypeCards = uniquePool.filter(card => card.archetype === focusArchetype);
        const otherCards = uniquePool.filter(card => card.archetype !== focusArchetype);

        if (archetypeCards.length >= count) {
            return shuffleArray(archetypeCards).slice(0, count);
        } else if (archetypeCards.length > 0) {
            // アーキタイプカード + ランダムカードで補完
            const remaining = count - archetypeCards.length;
            const randomOthers = shuffleArray(otherCards).slice(0, remaining);
            return shuffleArray([...archetypeCards, ...randomOthers]);
        }
    }

    // フォールバック: ランダム
    state.currentArchetypeFocus = null;
    return shuffleArray(uniquePool).slice(0, count);
}

function selectPackCards(cardPool, count) {
    // 重複を除去
    const uniquePool = [...new Map(cardPool.map(c => [c.id, c])).values()];

    // フォーカスパックが設定されていない場合（最初のピック）はランダム
    if (!state.focusPack) {
        state.currentPack = null;
        return shuffleArray(uniquePool).slice(0, count);
    }

    // 80%の確率でフォーカスパックからカードを選出
    if (Math.random() < 0.8) {
        // フォーカスパックのカードを取得
        const packCards = uniquePool.filter(card => {
            if (!card.card_sets) return false;
            return card.card_sets.some(set => set.set_name === state.focusPack);
        });

        if (packCards.length >= count) {
            state.currentPack = state.focusPack;
            return shuffleArray(packCards).slice(0, count);
        }
    }

    // 20%の確率、またはパックのカードが足りない場合はランダム
    state.currentPack = null;
    return shuffleArray(uniquePool).slice(0, count);
}

function selectAttributeRaceCards(cardPool, count) {
    state.currentArchetypeFocus = null;
    state.currentPack = null;

    const selectedAttrs = state.settings.selectedAttributes;
    const selectedRaces = state.settings.selectedRaces;

    // 重複を除去
    const uniquePool = [...new Map(cardPool.map(c => [c.id, c])).values()];

    // モンスターカードをフィルタリング（指定属性・種族）
    let filteredMonsters = uniquePool.filter(card => {
        const type = card.type.toLowerCase();
        if (!type.includes('monster')) return false;

        // 属性チェック（指定があれば）
        if (selectedAttrs.length > 0 && !selectedAttrs.includes(card.attribute)) {
            return false;
        }
        // 種族チェック（指定があれば）
        if (selectedRaces.length > 0 && !selectedRaces.includes(card.race)) {
            return false;
        }
        return true;
    });

    // フィルタされたモンスターのアーキタイプを収集
    const monsterArchetypes = new Set();
    filteredMonsters.forEach(card => {
        if (card.archetype) {
            monsterArchetypes.add(card.archetype);
        }
    });

    // 全ての魔法・罠カード
    const allSpellTrapCards = uniquePool.filter(card => {
        const type = card.type.toLowerCase();
        return type.includes('spell') || type.includes('trap');
    });

    // 関連する魔法・罠を判定
    const relatedSpellTraps = allSpellTrapCards.filter(card => {
        // 同じアーキタイプか確認
        if (card.archetype && monsterArchetypes.has(card.archetype)) {
            return true;
        }

        // カードテキストに属性・種族名が含まれるか確認
        const desc = (card.desc || '').toLowerCase();

        // 属性名をチェック（英語）
        for (const attr of selectedAttrs) {
            if (desc.includes(attr.toLowerCase())) {
                return true;
            }
        }

        // 種族名をチェック（英語、複数形も考慮）
        for (const race of selectedRaces) {
            const raceLower = race.toLowerCase();
            if (desc.includes(raceLower)) {
                return true;
            }
            // 複数形や派生形もチェック
            if (desc.includes(raceLower + ' monster') ||
                desc.includes(raceLower + '-type') ||
                desc.includes(raceLower + 's')) {
                return true;
            }
        }

        return false;
    });

    // 汎用魔法・罠（特定のタイプを指定しないカード）
    const genericSpellTraps = allSpellTrapCards.filter(card => {
        const desc = (card.desc || '').toLowerCase();
        // タイプ指定がないカードを汎用とみなす
        // ただし、特定タイプを「除外」するようなカードも除外
        const typeKeywords = [
            'dragon', 'spellcaster', 'warrior', 'machine', 'fiend', 'fairy',
            'zombie', 'beast', 'winged beast', 'dinosaur', 'insect', 'plant',
            'aqua', 'fish', 'sea serpent', 'reptile', 'pyro', 'thunder',
            'rock', 'psychic', 'wyrm', 'cyberse'
        ];
        const attrKeywords = ['dark', 'light', 'earth', 'water', 'fire', 'wind'];

        // タイプや属性の指定がなければ汎用
        const hasTypeRestriction = typeKeywords.some(kw => desc.includes(kw + ' monster') || desc.includes(kw + '-type'));
        const hasAttrRestriction = attrKeywords.some(kw => desc.includes(kw + ' monster') || desc.includes(kw + ' attribute'));

        return !hasTypeRestriction && !hasAttrRestriction;
    });

    // 魔法・罠のプール: 関連カード > 汎用カード > 全カード
    let spellTrapPool = [];
    if (relatedSpellTraps.length >= 10) {
        spellTrapPool = relatedSpellTraps;
    } else if (relatedSpellTraps.length > 0) {
        // 関連カードと汎用カードを混ぜる
        spellTrapPool = [...relatedSpellTraps, ...genericSpellTraps];
    } else {
        spellTrapPool = genericSpellTraps.length > 0 ? genericSpellTraps : allSpellTrapCards;
    }

    // 70%モンスター、30%魔法・罠の比率で選出
    const result = [];
    const usedIds = new Set();

    for (let i = 0; i < count; i++) {
        const roll = Math.random();

        if (roll < 0.7 && filteredMonsters.length > 0) {
            // 70%: モンスターを選出
            const availableMonsters = filteredMonsters.filter(c => !usedIds.has(c.id));
            if (availableMonsters.length > 0) {
                const selected = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
                result.push(selected);
                usedIds.add(selected.id);
                continue;
            }
        }

        // 30%: 関連魔法・罠を選出
        const availableSpellTraps = spellTrapPool.filter(c => !usedIds.has(c.id));
        if (availableSpellTraps.length > 0) {
            const selected = availableSpellTraps[Math.floor(Math.random() * availableSpellTraps.length)];
            result.push(selected);
            usedIds.add(selected.id);
        } else {
            // 魔法・罠も足りない場合はモンスターから
            const availableMonsters = filteredMonsters.filter(c => !usedIds.has(c.id));
            if (availableMonsters.length > 0) {
                const selected = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
                result.push(selected);
                usedIds.add(selected.id);
            }
        }
    }

    return shuffleArray(result);
}

// Modal Functions
async function showCardModal(card) {
    currentModalCard = card;

    // カスタムカード（画像なし）の場合
    if (card.isCustomCard) {
        elements.modalImage.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="580" fill="%231a1a2e"><rect width="100%" height="100%"/><text x="50%" y="45%" fill="%23ffd700" text-anchor="middle" font-size="24" font-weight="bold">' + encodeURIComponent(card.name) + '</text><text x="50%" y="55%" fill="%23888" text-anchor="middle" font-size="14">カスタムカード</text></svg>';
        elements.modalImage.alt = card.name;
        elements.modalName.textContent = card.name;
        elements.modalType.textContent = 'カスタムカード';
        elements.modalStats.innerHTML = '';

        // カスタム効果を表示
        if (card.customDesc) {
            elements.modalDesc.textContent = card.customDesc;
        } else {
            elements.modalDesc.textContent = '効果テキストがありません';
        }
    } else {
        // 通常カード（画像あり）
        elements.modalImage.src = getCardImageUrl(card.id, false);
        elements.modalImage.alt = card.name;
        elements.modalName.textContent = card.name;
        elements.modalType.textContent = getCardTypeJapanese(card);

        // アーキタイプ表示
        let typeText = getCardTypeJapanese(card);
        if (card.archetype) {
            typeText += ` / ${card.archetype}`;
        }
        elements.modalType.textContent = typeText;

        elements.modalStats.innerHTML = '';
        if (card.type.toLowerCase().includes('monster')) {
            if (card.level) elements.modalStats.innerHTML += `<span class="level">レベル ${card.level}</span>`;
            if (card.attribute) {
                const attrJp = { 'DARK': '闇', 'LIGHT': '光', 'EARTH': '地', 'WATER': '水', 'FIRE': '炎', 'WIND': '風', 'DIVINE': '神' };
                elements.modalStats.innerHTML += `<span class="attribute">${attrJp[card.attribute] || card.attribute}</span>`;
            }
            if (card.atk !== undefined) elements.modalStats.innerHTML += `<span class="atk">ATK ${card.atk}</span>`;
            if (card.def !== undefined) elements.modalStats.innerHTML += `<span class="def">DEF ${card.def}</span>`;
            if (card.linkval) elements.modalStats.innerHTML += `<span class="level">LINK-${card.linkval}</span>`;
        }

        // CSVにカスタム効果がある場合はそれを優先
        if (card.customDesc) {
            elements.modalDesc.textContent = card.customDesc;
        } else {
            elements.modalDesc.innerHTML = '<div class="loading-text">日本語テキストを読み込み中...</div>';
        }
    }

    elements.modal.classList.remove('hidden');

    // カスタム効果がない通常カードの場合のみ日本語データを取得
    if (!card.isCustomCard && !card.customDesc) {
        const japaneseData = await fetchJapaneseData(card.name);
        if (japaneseData) {
            if (japaneseData.japaneseName) {
                elements.modalName.textContent = japaneseData.japaneseName;
                elements.modalName.innerHTML += `<small style="display:block;font-size:0.7em;color:#aaa;margin-top:5px;">${card.name}</small>`;
            }
            // HTMLタグを安全にレンダリング（<br>など）
            const descText = japaneseData.japaneseLore || card.desc || 'テキスト情報がありません';
            elements.modalDesc.innerHTML = sanitizeHtml(descText);
        } else {
            const descText = card.desc || 'No description available.';
            elements.modalDesc.innerHTML = sanitizeHtml(descText);
        }
    }
}

function hideCardModal() {
    elements.modal.classList.add('hidden');
    currentModalCard = null;
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function updateModeDescription() {
    const mode = elements.pickMode.value;
    elements.modeDescription.textContent = modeDescriptions[mode];
    state.settings.pickMode = mode;

    // 属性・種族設定の表示切り替え
    if (mode === 'attribute-race') {
        elements.attributeRaceSettings.classList.remove('hidden');
    } else {
        elements.attributeRaceSettings.classList.add('hidden');
    }

    // CSV設定の表示切り替え
    if (mode === 'csv') {
        elements.csvSettings.classList.remove('hidden');
    } else {
        elements.csvSettings.classList.add('hidden');
    }
}

function updatePicksInfo() {
    state.settings.cardsPerPick = parseInt(elements.cardsPerPick.value) || 6;
    state.settings.cardsPerBlock = parseInt(elements.cardsPerBlock.value) || 2;

    // 数値入力のバリデーション
    let mainDeckSize = parseInt(elements.mainDeckSize.value);
    let exDeckSize = parseInt(elements.exDeckSize.value);

    // 無効な値の場合はデフォルト値を使用
    if (isNaN(mainDeckSize) || mainDeckSize < 1) mainDeckSize = 1;
    if (mainDeckSize > 60) mainDeckSize = 60;
    if (isNaN(exDeckSize) || exDeckSize < 0) exDeckSize = 0;
    if (exDeckSize > 15) exDeckSize = 15;

    state.settings.mainDeckSize = mainDeckSize;
    state.settings.exDeckSize = exDeckSize;

    // ブロック数を計算
    const numBlocks = Math.floor(state.settings.cardsPerPick / state.settings.cardsPerBlock);
    const cardsPerBlock = state.settings.cardsPerBlock;

    // ピック回数を計算（デッキ枚数 / 1ブロックのカード枚数）
    const mainRounds = Math.ceil(mainDeckSize / cardsPerBlock);
    const exRounds = exDeckSize > 0 ? Math.ceil(exDeckSize / cardsPerBlock) : 0;

    elements.mainPicks.textContent = mainDeckSize;
    elements.mainPickRounds.textContent = mainRounds;
    elements.exPicks.textContent = exDeckSize;
    elements.exPickRounds.textContent = exRounds;

    // ブロック情報を更新
    if (cardsPerBlock === 1) {
        elements.blockInfo.textContent = `${state.settings.cardsPerPick}枚から1枚を選択（従来方式）`;
    } else {
        elements.blockInfo.textContent = `${state.settings.cardsPerPick}枚を${numBlocks}ブロック（${cardsPerBlock}枚×${numBlocks}）で表示、1ブロックを選択`;
    }
}

function updateBlockOptions() {
    // 表示枚数に応じてブロック選択肢を調整
    const total = parseInt(elements.cardsPerPick.value);
    const blockSelect = elements.cardsPerBlock;
    const currentValue = parseInt(blockSelect.value);

    // 選択肢を再生成
    blockSelect.innerHTML = '';

    // 割り切れる数のみを選択肢に
    for (let i = 1; i <= total; i++) {
        if (total % i === 0 && total / i >= 2) {
            const option = document.createElement('option');
            option.value = i;
            if (i === 1) {
                option.textContent = `${i}枚（従来方式）`;
            } else {
                option.textContent = `${i}枚（${total / i}ブロック）`;
            }
            blockSelect.appendChild(option);
        }
    }

    // 元の値が有効なら復元、そうでなければデフォルト
    if ([...blockSelect.options].some(opt => parseInt(opt.value) === currentValue)) {
        blockSelect.value = currentValue;
    } else {
        // デフォルトは2枚か、割り切れない場合は最初の選択肢
        blockSelect.value = total % 2 === 0 ? 2 : blockSelect.options[0].value;
    }

    updatePicksInfo();
}

// チェックボックスから選択された値を取得
function getSelectedCheckboxValues(container) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

async function initGame() {
    elements.startBtn.disabled = true;
    elements.loadingStatus.classList.remove('hidden');

    try {
        if (state.cardSets.length === 0) {
            state.cardSets = await fetchCardSets();
        }

        if (state.allCards.length === 0) {
            state.allCards = await fetchAllCards();
            state.mainDeckCards = state.allCards.filter(card => !isExtraDeckCard(card));
            state.exDeckCards = state.allCards.filter(card => isExtraDeckCard(card));
        }

        const releaseDate = elements.releaseDate.value || null;
        state.settings.releaseDate = releaseDate;

        // 属性・種族設定を取得（複数選択）
        state.settings.selectedAttributes = getSelectedCheckboxValues(elements.attributeCheckboxes);
        state.settings.selectedRaces = getSelectedCheckboxValues(elements.raceCheckboxes);

        if (releaseDate) {
            state.filteredMainCards = filterCardsByDate(state.mainDeckCards, releaseDate);
            state.filteredExCards = filterCardsByDate(state.exDeckCards, releaseDate);
        } else {
            state.filteredMainCards = [...state.mainDeckCards];
            state.filteredExCards = [...state.exDeckCards];
        }

        if (state.filteredMainCards.length < state.settings.cardsPerPick) {
            alert('メインデッキ用のカードが不足しています。');
            return;
        }

        if (state.settings.exDeckSize > 0 && state.filteredExCards.length < state.settings.cardsPerPick) {
            alert('EXデッキ用のカードが不足しています。');
            return;
        }

        // 属性・種族モードのバリデーション
        if (state.settings.pickMode === 'attribute-race') {
            if (state.settings.selectedAttributes.length === 0 && state.settings.selectedRaces.length === 0) {
                alert('属性または種族のどちらかを選択してください。');
                return;
            }

            // 該当するカードがあるか確認
            let testCards = state.filteredMainCards.filter(card => card.type.toLowerCase().includes('monster'));
            if (state.settings.selectedAttributes.length > 0) {
                testCards = testCards.filter(card => state.settings.selectedAttributes.includes(card.attribute));
            }
            if (state.settings.selectedRaces.length > 0) {
                testCards = testCards.filter(card => state.settings.selectedRaces.includes(card.race));
            }
            if (testCards.length < state.settings.cardsPerPick) {
                const attrText = state.settings.selectedAttributes.map(a => attributeJapaneseMap[a]).join('・');
                const raceText = state.settings.selectedRaces.map(r => raceJapaneseMap[r]).join('・');
                alert(`該当するモンスターが不足しています（${attrText} ${raceText}: ${testCards.length}枚）。\n条件を変更してください。`);
                return;
            }
        }

        // CSVモードのバリデーション
        if (state.settings.pickMode === 'csv') {
            // 保留中の識別子があれば再マッチング
            if (state.csvPendingIdentifiers && state.csvPendingIdentifiers.length > 0) {
                matchCsvCards(state.csvPendingIdentifiers);
                state.csvPendingIdentifiers = null;
            }

            if (state.csvCards.length === 0) {
                alert('CSVファイルをアップロードしてください。');
                return;
            }

            if (state.csvMainCards.length < state.settings.cardsPerPick) {
                alert(`メインデッキ用のCSVカードが不足しています（${state.csvMainCards.length}枚）。\n最低${state.settings.cardsPerPick}枚必要です。`);
                return;
            }

            if (state.settings.exDeckSize > 0 && state.csvExCards.length < state.settings.cardsPerPick) {
                alert(`EXデッキ用のCSVカードが不足しています（${state.csvExCards.length}枚）。\nEXデッキ枚数を0にするか、EXデッキモンスターを追加してください。`);
                return;
            }
        }

        // リセット
        state.currentPhase = 'main';
        state.currentPick = 0;
        state.mainPicks = 0;
        state.exPicks = 0;
        state.selectedMainCards = [];
        state.selectedExCards = [];
        state.pickedArchetypes = {};
        state.currentArchetypeFocus = null;
        state.currentPack = null;
        state.focusPack = null;  // パックモード用リセット
        state.pickedCardCounts = {};  // カード枚数カウントをリセット

        startPicking();
    } catch (error) {
        alert('カードデータの読み込みに失敗しました。');
        console.error(error);
    } finally {
        elements.startBtn.disabled = false;
        elements.loadingStatus.classList.add('hidden');
    }
}

function startPicking() {
    showScreen('pick-screen');
    window.scrollTo(0, 0);
    updatePickUI();
    showNextPick();
}

function updatePickUI() {
    if (state.currentPhase === 'main') {
        elements.deckTypeIndicator.textContent = 'メインデッキ';
        elements.deckTypeIndicator.className = 'deck-type-indicator main';
    } else {
        elements.deckTypeIndicator.textContent = 'EXデッキ';
        elements.deckTypeIndicator.className = 'deck-type-indicator ex';
    }
    // totalPickDisplayとcardsGainedはshowNextPickで更新される
}

function updatePickContext() {
    const mode = state.settings.pickMode;

    if (mode === 'archetype' && state.currentArchetypeFocus) {
        elements.pickContext.textContent = `アーキタイプ: ${state.currentArchetypeFocus}`;
        elements.pickContext.className = 'pick-context archetype';
    } else if (mode === 'pack') {
        if (state.focusPack) {
            const packInfo = state.currentPack
                ? `パック: ${state.focusPack}`
                : `パック: ${state.focusPack}（ランダム）`;
            elements.pickContext.textContent = packInfo;
            elements.pickContext.className = 'pick-context pack';
        } else {
            elements.pickContext.textContent = '最初のカードを選んでください';
            elements.pickContext.className = 'pick-context pack';
        }
    } else if (mode === 'attribute-race') {
        const attrs = state.settings.selectedAttributes;
        const races = state.settings.selectedRaces;
        const parts = [];
        if (attrs.length > 0) {
            parts.push(attrs.map(a => attributeJapaneseMap[a]).join('・'));
        }
        if (races.length > 0) {
            parts.push(races.map(r => raceJapaneseMap[r]).join('・'));
        }
        if (parts.length > 0) {
            elements.pickContext.textContent = parts.join(' / ');
            elements.pickContext.className = 'pick-context attribute-race';
        } else {
            elements.pickContext.className = 'pick-context hidden';
        }
    } else if (mode === 'csv') {
        const csvCount = state.currentPhase === 'main' ? state.csvMainCards.length : state.csvExCards.length;
        elements.pickContext.textContent = `CSVカードプール: ${csvCount}枚`;
        elements.pickContext.className = 'pick-context csv';
    } else {
        elements.pickContext.className = 'pick-context hidden';
    }
}

function showNextPick() {
    state.currentPick++;
    window.scrollTo(0, 0);

    const cardsPerBlock = state.settings.cardsPerBlock;
    const currentGained = state.currentPhase === 'main'
        ? state.selectedMainCards.length
        : state.selectedExCards.length;

    // 目標枚数と残り必要枚数を計算
    const targetSize = state.currentPhase === 'main'
        ? state.settings.mainDeckSize
        : state.settings.exDeckSize;
    const remaining = targetSize - currentGained;
    const actualCardsToGain = Math.min(cardsPerBlock, remaining);

    // 進捗表示を更新
    elements.currentPickDisplay.textContent = state.currentPick;
    elements.cardsGained.textContent = currentGained;

    const totalRounds = Math.ceil(targetSize / cardsPerBlock);
    elements.totalPickDisplay.textContent = totalRounds;

    // 指示テキストを更新
    if (actualCardsToGain === 1) {
        elements.pickInstruction.textContent = 'カードを1枚選択してください';
    } else if (actualCardsToGain < cardsPerBlock) {
        elements.pickInstruction.textContent = `ブロックを選択してください（残り${actualCardsToGain}枚で完了）`;
    } else {
        elements.pickInstruction.textContent = `ブロックを選択してください（${cardsPerBlock}枚獲得）`;
    }

    // カードプールから3枚以上ピック済みのカードを除外
    let basePool;
    if (state.settings.pickMode === 'csv') {
        basePool = state.currentPhase === 'main' ? state.csvMainCards : state.csvExCards;
    } else {
        basePool = state.currentPhase === 'main' ? state.filteredMainCards : state.filteredExCards;
    }
    const cardPool = filterAvailableCards(basePool);

    // 最後のピックで余りがある場合は、ブロックの表示枚数を調整
    const displayCardsPerBlock = actualCardsToGain < cardsPerBlock ? actualCardsToGain : cardsPerBlock;
    const numBlocks = Math.floor(state.settings.cardsPerPick / cardsPerBlock);
    const totalCardsNeeded = displayCardsPerBlock * numBlocks;

    state.currentOptions = selectCardsForPick(cardPool, totalCardsNeeded);

    updatePickContext();

    elements.cardsContainer.innerHTML = '';

    // 設定が1枚ずつの場合のみ従来方式
    if (state.settings.cardsPerBlock === 1) {
        elements.cardsContainer.classList.add('legacy-mode');
        state.currentOptions.forEach((card, index) => {
            const cardElement = createCardElement(card, index);
            elements.cardsContainer.appendChild(cardElement);
        });
    } else {
        // ブロック方式（余りがある場合も含む）
        elements.cardsContainer.classList.remove('legacy-mode');

        for (let blockIndex = 0; blockIndex < numBlocks; blockIndex++) {
            const blockElement = document.createElement('div');
            blockElement.className = 'card-block';
            blockElement.dataset.blockIndex = blockIndex;

            const blockLabel = document.createElement('div');
            blockLabel.className = 'block-label';
            blockLabel.textContent = `ブロック ${blockIndex + 1}`;
            blockElement.appendChild(blockLabel);

            const blockCards = document.createElement('div');
            blockCards.className = 'block-cards';

            // ブロック内のカードを追加（実際に獲得する枚数分だけ表示）
            const startIdx = blockIndex * displayCardsPerBlock;
            for (let i = 0; i < displayCardsPerBlock; i++) {
                const cardIndex = startIdx + i;
                if (cardIndex < state.currentOptions.length) {
                    const card = state.currentOptions[cardIndex];
                    const cardElement = createCardElement(card, cardIndex, true);
                    blockCards.appendChild(cardElement);
                }
            }

            blockElement.appendChild(blockCards);

            // ブロック選択ボタン
            const selectBtn = document.createElement('button');
            selectBtn.className = 'block-select-btn';
            selectBtn.textContent = `このブロックを選ぶ（${displayCardsPerBlock}枚）`;
            selectBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                selectBlock(blockIndex, displayCardsPerBlock);
            });
            blockElement.appendChild(selectBtn);

            // ブロック全体のクリックでも選択可能
            blockElement.addEventListener('click', (e) => {
                if (e.target === blockElement || e.target === blockCards || e.target === blockLabel) {
                    selectBlock(blockIndex, displayCardsPerBlock);
                }
            });

            elements.cardsContainer.appendChild(blockElement);
        }
    }
}

// カード要素を作成
function createCardElement(card, index, inBlock = false) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card-option';
    cardElement.dataset.index = index;

    // カスタムカード（画像なし）の場合
    if (card.isCustomCard) {
        const placeholder = document.createElement('div');
        placeholder.className = 'card-placeholder';

        const nameText = document.createElement('span');
        nameText.className = 'card-placeholder-name';
        nameText.textContent = card.name;
        placeholder.appendChild(nameText);

        if (card.desc) {
            const descText = document.createElement('span');
            descText.className = 'card-placeholder-desc';
            descText.textContent = card.desc.length > 50 ? card.desc.substring(0, 50) + '...' : card.desc;
            placeholder.appendChild(descText);
        }

        placeholder.addEventListener('click', (e) => {
            e.stopPropagation();
            showCardModal(card);
        });

        cardElement.appendChild(placeholder);
    } else {
        // 通常カード（画像あり）
        const img = document.createElement('img');
        img.src = getCardImageUrl(card.id, true);
        img.alt = card.name;
        img.loading = 'lazy';
        img.onerror = () => {
            img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="290" fill="%23333"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%23fff" text-anchor="middle" dy=".3em">画像なし</text></svg>';
        };
        img.addEventListener('click', (e) => {
            e.stopPropagation();
            showCardModal(card);
        });

        cardElement.appendChild(img);
    }

    // 従来方式の場合のみ個別選択ボタン
    if (!inBlock && state.settings.cardsPerBlock === 1) {
        const selectBtn = document.createElement('button');
        selectBtn.className = 'card-select-btn';
        selectBtn.textContent = '選ぶ';
        selectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            selectCard(index);
        });
        cardElement.appendChild(selectBtn);
    }

    return cardElement;
}

// ブロック選択
// パックモード: 最初に選んだカードのパックを記録
function updateFocusPack(card) {
    if (state.settings.pickMode !== 'pack') return;
    if (state.focusPack) return;  // 既に設定済み

    // カードのパックを取得（最初に見つかったパック）
    if (card.card_sets && card.card_sets.length > 0) {
        state.focusPack = card.card_sets[0].set_name;
    }
}

function selectBlock(blockIndex, cardsInBlock) {
    const startIdx = blockIndex * cardsInBlock;

    // ブロック内の全カードを取得
    const selectedCards = [];
    for (let i = 0; i < cardsInBlock; i++) {
        const cardIndex = startIdx + i;
        if (cardIndex < state.currentOptions.length) {
            selectedCards.push(state.currentOptions[cardIndex]);
        }
    }

    // カードを追加
    selectedCards.forEach(card => {
        updatePickedArchetypes(card);
        updatePickedCardCount(card);
        updateFocusPack(card);  // パックモード用

        if (state.currentPhase === 'main') {
            state.selectedMainCards.push(card);
        } else {
            state.selectedExCards.push(card);
        }
    });

    // ブロックを選択状態にする
    const blockElements = document.querySelectorAll('.card-block');
    blockElements[blockIndex].classList.add('selected');

    // 次のピックへ
    setTimeout(() => {
        proceedToNextPick();
    }, 400);
}

function selectCard(index) {
    const selectedCard = state.currentOptions[index];

    // アーキタイプを記録
    updatePickedArchetypes(selectedCard);

    // カード枚数を記録（3枚制限用）
    updatePickedCardCount(selectedCard);

    // パックモード用
    updateFocusPack(selectedCard);

    if (state.currentPhase === 'main') {
        state.selectedMainCards.push(selectedCard);
    } else {
        state.selectedExCards.push(selectedCard);
    }

    const cardElements = document.querySelectorAll('.card-option');
    cardElements.forEach((el, i) => {
        if (i === index) el.classList.add('selected');
    });

    setTimeout(() => {
        proceedToNextPick();
    }, 300);
}

// 次のピックに進むか、フェーズを終了するか判断
function proceedToNextPick() {
    const currentGained = state.currentPhase === 'main'
        ? state.selectedMainCards.length
        : state.selectedExCards.length;
    const targetSize = state.currentPhase === 'main'
        ? state.settings.mainDeckSize
        : state.settings.exDeckSize;

    if (state.currentPhase === 'main') {
        if (currentGained >= targetSize) {
            // メインデッキ完了、EXデッキへ
            if (state.settings.exDeckSize > 0) {
                state.currentPhase = 'ex';
                state.currentPick = 0;
                updatePickUI();
                showNextPick();
            } else {
                showResults();
            }
        } else {
            showNextPick();
        }
    } else {
        if (currentGained >= targetSize) {
            showResults();
        } else {
            showNextPick();
        }
    }
}

function showResults() {
    showScreen('result-screen');
    window.scrollTo(0, 0);

    const mainMonsters = state.selectedMainCards.filter(c => getCardType(c) === 'monster');
    const mainSpells = state.selectedMainCards.filter(c => getCardType(c) === 'spell');
    const mainTraps = state.selectedMainCards.filter(c => getCardType(c) === 'trap');

    elements.mainDeckCount.textContent = state.selectedMainCards.length;
    elements.mainMonsterCount.textContent = mainMonsters.length;
    elements.mainSpellCount.textContent = mainSpells.length;
    elements.mainTrapCount.textContent = mainTraps.length;

    renderCardList(elements.mainMonsterCards, mainMonsters);
    renderCardList(elements.mainSpellCards, mainSpells);
    renderCardList(elements.mainTrapCards, mainTraps);

    if (state.settings.exDeckSize > 0) {
        elements.exDeckSection.style.display = 'block';
        elements.exDeckCount.textContent = state.selectedExCards.length;
        renderCardList(elements.exDeckCards, state.selectedExCards);
    } else {
        elements.exDeckSection.style.display = 'none';
    }
}

function renderCardList(container, cards) {
    container.innerHTML = '';
    if (cards.length === 0) {
        container.innerHTML = '<p style="color: #888;">なし</p>';
        return;
    }

    cards.forEach(card => {
        const cardElement = document.createElement('div');
        cardElement.className = 'result-card';

        if (card.isCustomCard) {
            // カスタムカード（画像なし）
            const placeholder = document.createElement('div');
            placeholder.className = 'result-card-placeholder';
            placeholder.textContent = card.name.substring(0, 10);
            cardElement.appendChild(placeholder);
        } else {
            // 通常カード（画像あり）
            const img = document.createElement('img');
            img.src = getCardImageUrl(card.id, true);
            img.alt = card.name;
            img.loading = 'lazy';
            img.onerror = () => {
                img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="175" fill="%23333"><rect width="100%" height="100%"/><text x="50%" y="50%" fill="%23fff" text-anchor="middle" dy=".3em" font-size="10">画像なし</text></svg>';
            };
            cardElement.appendChild(img);
        }

        const nameLabel = document.createElement('div');
        nameLabel.className = 'card-name';
        nameLabel.textContent = card.name;

        cardElement.appendChild(nameLabel);
        cardElement.addEventListener('click', () => showCardModal(card));
        container.appendChild(cardElement);
    });
}

function retryPick() {
    state.currentPhase = 'main';
    state.currentPick = 0;
    state.mainPicks = 0;
    state.exPicks = 0;
    state.selectedMainCards = [];
    state.selectedExCards = [];
    state.pickedArchetypes = {};
    state.currentArchetypeFocus = null;
    state.currentPack = null;
    state.focusPack = null;  // パックモード用リセット
    state.pickedCardCounts = {};  // カード枚数カウントをリセット
    startPicking();
}

// Export functions
function exportAsYdk() {
    let ydkContent = '#created by YuGiOh 2Pick Simulator\n#main\n';
    state.selectedMainCards.forEach(card => { ydkContent += card.id + '\n'; });
    ydkContent += '#extra\n';
    state.selectedExCards.forEach(card => { ydkContent += card.id + '\n'; });
    ydkContent += '!side\n';

    const blob = new Blob([ydkContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2pick_deck.ydk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('YDKファイルをダウンロードしました');
}

function exportAsText() {
    let textContent = '=== メインデッキ ===\n';
    state.selectedMainCards.forEach(card => { textContent += card.name + '\n'; });
    if (state.selectedExCards.length > 0) {
        textContent += '\n=== EXデッキ ===\n';
        state.selectedExCards.forEach(card => { textContent += card.name + '\n'; });
    }

    navigator.clipboard.writeText(textContent).then(() => {
        showToast('カード名をクリップボードにコピーしました');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = textContent;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('カード名をクリップボードにコピーしました');
    });
}

function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// CSVファイル処理
function handleCsvUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    elements.csvFileName.textContent = file.name;
    elements.csvStatus.textContent = '読み込み中...';
    elements.csvStatus.className = 'csv-status';

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const content = e.target.result;
            parseCsvContent(content);
        } catch (error) {
            elements.csvStatus.textContent = `エラー: ${error.message}`;
            elements.csvStatus.className = 'csv-status error';
        }
    };
    reader.onerror = function() {
        elements.csvStatus.textContent = 'ファイルの読み込みに失敗しました';
        elements.csvStatus.className = 'csv-status error';
    };
    reader.readAsText(file);
}

function parseCsvContent(content) {
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
        elements.csvStatus.textContent = 'CSVファイルが空です';
        elements.csvStatus.className = 'csv-status error';
        return;
    }

    // ヘッダー行かどうかを判定
    const firstLine = lines[0].trim().toLowerCase();
    const headerKeywords = ['id', 'name', 'card', 'カード', '名前', '効果', 'desc', 'effect'];
    const isHeader = headerKeywords.some(kw => firstLine.includes(kw));

    const dataLines = isHeader ? lines.slice(1) : lines;

    const cardEntries = [];
    dataLines.forEach(line => {
        // CSVパース（カンマ区切り、クォート対応）
        const parts = parseCSVLine(line);
        const name = parts[0] ? parts[0].trim() : '';
        const description = parts[1] ? parts[1].trim() : '';
        const deckType = parts[2] ? parts[2].trim().toUpperCase() : '';
        const isExDeck = deckType === 'EX' || deckType === 'EXTRA';

        if (name) {
            cardEntries.push({ name, description, isExDeck });
        }
    });

    if (cardEntries.length === 0) {
        elements.csvStatus.textContent = 'カードデータが見つかりませんでした';
        elements.csvStatus.className = 'csv-status error';
        return;
    }

    // カードデータとマッチング
    matchCsvCards(cardEntries);
}

// CSVの1行をパース（クォート内のカンマを考慮）
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"' || char === "'") {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

function matchCsvCards(cardEntries) {
    // APIデータがまだ読み込まれていない場合は保存しておく
    if (state.allCards.length === 0) {
        state.csvPendingIdentifiers = cardEntries;
        elements.csvStatus.textContent = `${cardEntries.length}枚のカードを読み込みました\n※ APIデータ読み込み後に画像マッチングを行います`;
        elements.csvStatus.className = 'csv-status success';

        // 仮のカスタムカードを作成
        const tempCards = cardEntries.map((entry, index) => ({
            id: `custom_${Date.now()}_${index}`,
            name: entry.name,
            type: 'Custom Card',
            desc: entry.description || '',
            customDesc: entry.description || '',
            isCustomCard: true,
            isExDeck: entry.isExDeck || false,
            attribute: null,
            race: null
        }));
        state.csvCards = tempCards;
        state.csvMainCards = tempCards.filter(c => !c.isExDeck);
        state.csvExCards = tempCards.filter(c => c.isExDeck);
        return;
    }

    const processedCards = [];
    let matchedCount = 0;
    let customCount = 0;

    cardEntries.forEach((entry, index) => {
        let matchedCard = null;

        // IDで検索（数字の場合）
        if (/^\d+$/.test(entry.name)) {
            matchedCard = state.allCards.find(c => c.id.toString() === entry.name);
        }

        // 英語名で完全一致検索
        if (!matchedCard) {
            const lowerName = entry.name.toLowerCase();
            matchedCard = state.allCards.find(c =>
                c.name.toLowerCase() === lowerName
            );
        }

        if (matchedCard) {
            // マッチしたカード（画像あり）
            const card = { ...matchedCard };
            // CSVに効果が書かれていればそちらを優先
            if (entry.description) {
                card.customDesc = entry.description;
            }
            card.csvName = entry.name; // 元のCSV名も保持
            processedCards.push(card);
            matchedCount++;
        } else {
            // マッチしなかったカード（カスタムカード、画像なし）
            const customCard = {
                id: `custom_${Date.now()}_${index}`,
                name: entry.name,
                type: 'Custom Card',
                desc: entry.description || '',
                customDesc: entry.description || '',
                isCustomCard: true,
                isExDeck: entry.isExDeck || false,
                attribute: null,
                race: null
            };
            processedCards.push(customCard);
            customCount++;
        }
    });

    // カードを保存（正規カードはタイプで判定、カスタムカードはisExDeckフラグで判定）
    state.csvCards = processedCards;
    state.csvMainCards = processedCards.filter(c => {
        if (c.isCustomCard) return !c.isExDeck;
        return !isExtraDeckCard(c);
    });
    state.csvExCards = processedCards.filter(c => {
        if (c.isCustomCard) return c.isExDeck;
        return isExtraDeckCard(c);
    });

    // 結果を表示
    let statusText = `${processedCards.length}枚のカードを読み込みました`;
    if (matchedCount > 0) {
        statusText += `\n画像あり: ${matchedCount}枚`;
    }
    if (customCount > 0) {
        statusText += `\nカスタムカード: ${customCount}枚（画像なし）`;
    }
    statusText += `\n（メイン: ${state.csvMainCards.length}枚, EX: ${state.csvExCards.length}枚）`;

    elements.csvStatus.textContent = statusText;
    elements.csvStatus.className = processedCards.length > 0 ? 'csv-status success' : 'csv-status error';
}

// Event Listeners
elements.pickMode.addEventListener('change', updateModeDescription);
elements.cardsPerPick.addEventListener('change', updateBlockOptions);
elements.cardsPerBlock.addEventListener('change', updatePicksInfo);
elements.mainDeckSize.addEventListener('input', updatePicksInfo);
elements.exDeckSize.addEventListener('input', updatePicksInfo);
elements.csvFile.addEventListener('change', handleCsvUpload);

// ドラッグ&ドロップ
elements.csvDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.csvDropArea.classList.add('drag-over');
});

elements.csvDropArea.addEventListener('dragleave', (e) => {
    e.preventDefault();
    elements.csvDropArea.classList.remove('drag-over');
});

elements.csvDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.csvDropArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
            // ファイル入力にセットしてイベントを発火
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            elements.csvFile.files = dataTransfer.files;
            handleCsvUpload({ target: { files: [file] } });
        } else {
            elements.csvStatus.textContent = 'CSVまたはTXTファイルをドロップしてください';
            elements.csvStatus.className = 'csv-status error';
        }
    }
});

elements.startBtn.addEventListener('click', initGame);
elements.backToSettings.addEventListener('click', () => showScreen('settings-screen'));
elements.retryBtn.addEventListener('click', retryPick);
elements.newSettingsBtn.addEventListener('click', () => showScreen('settings-screen'));
elements.exportYdkBtn.addEventListener('click', exportAsYdk);
elements.exportTextBtn.addEventListener('click', exportAsText);

elements.modalClose.addEventListener('click', hideCardModal);
elements.modalOverlay.addEventListener('click', hideCardModal);
elements.modalCloseBtn.addEventListener('click', hideCardModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !elements.modal.classList.contains('hidden')) {
        hideCardModal();
    }
});

// Initialize
updateModeDescription();
updateBlockOptions();  // これがupdatePicksInfoも呼ぶ
