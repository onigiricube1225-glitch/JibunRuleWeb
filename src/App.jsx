import { useEffect, useMemo, useState } from 'react'
import {
  Star,
  Settings,
  Sun,
  Calendar,
  Type,
  Trophy,
  Gift,
  History,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  X,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react'
import './App.css'

const STORAGE_KEY = 'jibunrule-tracker-v1'

const defaultChallenges = {
  daily: [
    { id: 'd1', label: '30分以上机に向かった', points: 1, category: '勉強習慣', active: true },
    { id: 'd2', label: '読解問題を1つ解いて丸つけした', points: 3, category: '国語', active: true },
    { id: 'd3', label: '漢字・語彙を10個覚えた', points: 2, category: '国語', active: true },
    { id: 'd4', label: '応用問題を1問解いた', points: 1, category: '数学', active: true },
    { id: 'd5', label: '夏期講習・馬渕の宿題を1日分終わらせた', points: 2, category: '夏休み限定', active: true },
  ],

  weekly: [
    { id: 'w1', label: '1週間毎日勉強できた週ボーナス', points: 5, category: '勉強習慣', active: true },
    { id: 'w2', label: '洗濯を1回した', points: 5, category: '生活', active: true },
    { id: 'w3', label: 'ゲームを週3時間以内に収められた', points: 8, category: '自己管理', active: true },
    { id: 'w4', label: '馬渕国語の過去問・対策プリント1回分', points: 10, category: '夏休み限定', active: true },
    { id: 'w5', label: '模試の復習ノートを1ページ作った', points: 4, category: '夏休み限定', active: true },
  ],

  monthly: [
    { id: 'm1', label: '月100時間勉強を達成した', points: 30, category: '勉強習慣', active: true },
  ],
}

const defaultProblems = [
  {
    id: 'p1',
    label: '英単語',
    target: 300,
    unit: '個',
    points: 30,
    active: true,
  },
]

const defaultRewards = [
  { id: 'r1', label: 'お菓子・ジュース', points: 10 },
  { id: 'r2', label: '動画を1本見る', points: 15 },
  { id: 'r3', label: 'ゲーム追加30分', points: 20 },
  { id: 'r4', label: '欲しい文房具', points: 50 },
  { id: 'r5', label: '漫画1冊', points: 60 },
  { id: 'r6', label: '映画館', points: 100 },
  { id: 'r7', label: '中古ゲームソフト', points: 150 },
  { id: 'r8', label: '新品ゲームソフト', points: 300 },
  { id: 'r9', label: 'イヤホン・ヘッドホン', points: 400 },
  { id: 'r10', label: '旅行', points: 2000 },
]

const categoryOrder = [
  '国語',
  '勉強習慣',
  '数学',
  '夏休み限定',
  '生活',
  '自己管理',
  'カスタム',
]

const categoryClass = {
  国語: 'japanese',
  数学: 'math',
  勉強習慣: 'study',
  夏休み限定: 'summer',
  生活: 'life',
  自己管理: 'control',
  カスタム: 'custom',
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`
}

function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ))

  const day = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - day + 3)

  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))

  const week =
    1 +
    Math.round(
      ((d - firstThursday) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7
    )

  return `${d.getUTCFullYear()}-W${pad2(week)}`
}

function weekRangeLabel(date = new Date()) {
  const day = (date.getDay() + 6) % 7

  const monday = new Date(date)
  monday.setDate(date.getDate() - day)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return `${monday.getMonth() + 1}/${monday.getDate()}〜${sunday.getMonth() + 1}/${sunday.getDate()}`
}

function formatDateJP(date = new Date()) {
  const days = ['日', '月', '火', '水', '木', '金', '土']

  return `${date.getMonth() + 1}月${date.getDate()}日(${days[date.getDay()]})`
}

function formatMonthJP(date = new Date()) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function groupAndOrder(items) {
  const groups = {}

  items.forEach((item) => {
    if (!groups[item.category]) {
      groups[item.category] = []
    }

    groups[item.category].push(item)
  })

  return Object.keys(groups)
    .sort((a, b) => {
      const ia = categoryOrder.indexOf(a)
      const ib = categoryOrder.indexOf(b)

      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
    .map((category) => ({
      category,
      items: groups[category],
    }))
}

function SectionHeader({ icon, title, sub }) {
  return (
    <div className="section-header">
      <div className="section-title">
        {icon}
        <span>{title}</span>
      </div>

      {sub && <span className="section-sub">{sub}</span>}
    </div>
  )
}

function ProgressBar({ value, max = 300 }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

function ChallengeGroup({ category, items, doneMap, onToggle }) {
  const className = categoryClass[category] || 'custom'

  return (
    <div className={`challenge-group ${className}`}>
      <div className="challenge-category">
        {category}
      </div>

      <div className="challenge-items">
        {items.map((challenge) => {
          const done = !!doneMap[challenge.id]

          return (
            <button
              key={challenge.id}
              className={`challenge-row ${done ? 'done' : ''}`}
              onClick={() => onToggle(challenge)}
            >
              {done ? (
                <CheckCircle2 className="challenge-check" />
              ) : (
                <Circle className="challenge-check" />
              )}

              <span className="challenge-label">
                {challenge.label}
              </span>

              <span className="point-badge">
                {challenge.points}pt
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RewardRow({ reward, totalPoints, onRedeem }) {
  const short = reward.points - totalPoints
  const canRedeem = short <= 0

  return (
    <div className="reward-row">
      <div className="reward-info">
        <div className="reward-name">
          {reward.label}
        </div>

        <div className="reward-points">
          {reward.points}pt
        </div>
      </div>

      {canRedeem ? (
        <button
          className="redeem-button"
          onClick={() => onRedeem(reward)}
        >
          交換する
        </button>
      ) : (
        <span className="short-text">
          あと <b>{short}</b>pt
        </span>
      )}
    </div>
  )
}

function EmptyNote({ text }) {
  return (
    <div className="empty-note">
      {text}
    </div>
  )
}

function App() {
 const [challenges, setChallenges] = useState(defaultChallenges)
 const [loaded, setLoaded] = useState(false)
 const [rewards, setRewards] = useState(defaultRewards)

  const [dailyDone, setDailyDone] = useState({})
  const [weeklyDone, setWeeklyDone] = useState({})
  const [monthlyDone, setMonthlyDone] = useState({})

const [vocabLog, setVocabLog] = useState({})
const [problems, setProblems] = useState(defaultProblems)
const [problemLog, setProblemLog] = useState({})
const [transactions, setTransactions] = useState([])

  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const [activeTab, setActiveTab] = useState("today")

  const [celebrate, setCelebrate] = useState(null)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)

      if (!saved) return

      const data = JSON.parse(saved)

      setChallenges(data.challenges || defaultChallenges)
      setRewards(data.rewards || defaultRewards)
      setDailyDone(data.dailyDone || {})
      setWeeklyDone(data.weeklyDone || {})
      setMonthlyDone(data.monthlyDone || {})
setVocabLog(data.vocabLog || {})
setProblems(data.problems || defaultProblems)
setProblemLog(data.problemLog || {})
setTransactions(data.transactions || [])
    } catch (error) {
      console.error('データ読み込み失敗:', error)
    } finally {
      setLoaded(true)
    }
  }, [])
useEffect(() => {
  if (!loaded) return

const data = {
  challenges,
  rewards,
  dailyDone,
  weeklyDone,
  monthlyDone,
  vocabLog,
  problems,
  problemLog,
  transactions,
}

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    )
  }, [
    challenges,
    rewards,
    dailyDone,
    weeklyDone,
    monthlyDone,
    vocabLog,
    problems,
    problemLog,
    transactions,
  ])
  const totalPoints = useMemo(() => {
    return transactions.reduce(
      (sum, transaction) => sum + transaction.points,
      0
    )
  }, [transactions])

  const thisMonth = monthKey()

  const monthEarned = useMemo(() => {
    return transactions
      .filter(
        (transaction) =>
          transaction.date.slice(0, 7) === thisMonth &&
          transaction.points > 0
      )
      .reduce(
        (sum, transaction) => sum + transaction.points,
        0
      )
  }, [transactions, thisMonth])

  function addTransaction(label, points) {
    setTransactions((prev) => [
      ...prev,
      {
        id: uid(),
        date: localDateKey(),
        label,
        points,
      },
    ])
  }

  function flashPoints(points) {
    setCelebrate({
      type: 'point',
      points,
    })

    setTimeout(() => {
      setCelebrate(null)
    }, 1100)
  }

  function toggleDaily(challenge) {
    const key = localDateKey()
    const done = !!dailyDone[key]?.[challenge.id]

    setDailyDone((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [challenge.id]: !done,
      },
    }))

    addTransaction(
      `${done ? '取消: ' : ''}${challenge.label}`,
      done ? -challenge.points : challenge.points
    )

    if (!done) {
      flashPoints(challenge.points)
    }
  }

  function toggleWeekly(challenge) {
    const key = isoWeekKey()
    const done = !!weeklyDone[key]?.[challenge.id]

    setWeeklyDone((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [challenge.id]: !done,
      },
    }))

    addTransaction(
      `${done ? '取消: ' : ''}${challenge.label}`,
      done ? -challenge.points : challenge.points
    )

    if (!done) {
      flashPoints(challenge.points)
    }
  }

  function toggleMonthly(challenge) {
    const key = monthKey()
    const done = !!monthlyDone[key]?.[challenge.id]

    setMonthlyDone((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [challenge.id]: !done,
      },
    }))

    addTransaction(
      `${done ? '取消: ' : ''}${challenge.label}`,
      done ? -challenge.points : challenge.points
    )

    if (!done) {
      flashPoints(challenge.points)
    }
  }

  function addVocabSet() {
    const key = monthKey()

    setVocabLog((prev) => ({
      ...prev,
      [key]: (prev[key] || 0) + 1,
    }))

    addTransaction('英単語10個', 1)
    flashPoints(1)
  }

  function removeVocabSet() {
    const key = monthKey()

    if (!vocabLog[key]) return

    setVocabLog((prev) => ({
      ...prev,
      [key]: Math.max(0, (prev[key] || 0) - 1),
    }))

    addTransaction('取消: 英単語10個', -1)
  }

  function redeemReward(reward) {
    if (totalPoints < reward.points) return

    addTransaction(
      `交換: ${reward.label}`,
      -reward.points
    )

    setCelebrate({
      type: 'reward',
      label: reward.label,
    })

    setTimeout(() => {
      setCelebrate(null)
    }, 1600)
  }

  function updateChallenge(freq, id, patch) {
    setChallenges((prev) => ({
      ...prev,
      [freq]: prev[freq].map((challenge) =>
        challenge.id === id
          ? { ...challenge, ...patch }
          : challenge
      ),
    }))
  }

  function removeChallenge(freq, id) {
    setChallenges((prev) => ({
      ...prev,
      [freq]: prev[freq].filter(
        (challenge) => challenge.id !== id
      ),
    }))
  }

  function addChallenge(freq, label, points) {
    setChallenges((prev) => ({
      ...prev,
      [freq]: [
        ...prev[freq],
        {
          id: uid(),
          label,
          points: Number(points) || 1,
          category: 'カスタム',
          active: true,
        },
      ],
    }))
  }

  function updateReward(id, patch) {
    setRewards((prev) =>
      prev.map((reward) =>
        reward.id === id
          ? { ...reward, ...patch }
          : reward
      )
    )
  }

  function removeReward(id) {
    setRewards((prev) =>
      prev.filter((reward) => reward.id !== id)
    )
  }

  function addReward(label, points) {
    setRewards((prev) => [
      ...prev,
      {
        id: uid(),
        label,
        points: Number(points) || 10,
      },
    ])
  }

  const today = localDateKey()
  const thisWeek = isoWeekKey()

  const doneToday = dailyDone[today] || {}
  const doneThisWeek = weeklyDone[thisWeek] || {}
  const doneThisMonth = monthlyDone[thisMonth] || {}

  const vocabCount = (vocabLog[thisMonth] || 0) * 10

  const dailyGroups = groupAndOrder(
    challenges.daily.filter((challenge) => challenge.active)
  )

  const weeklyGroups = groupAndOrder(
    challenges.weekly.filter((challenge) => challenge.active)
  )

  const monthlyGroups = groupAndOrder(
    challenges.monthly.filter((challenge) => challenge.active)
  )

  if (!loaded) {
    return (
      <div className="splash-screen">
        <div className="splash-content">
          <h1 className="splash-title">JibunRule</h1>
          <div className="splash-tagline">
            自分で決めたルールを<br />
            自分で守る。
          </div>
          <div className="splash-loading">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="top-bar">
        <div className="top-inner">
          <div>
            <div className="points-label">
              保有ポイント
            </div>

            <div className="points-display">
              <Star
                size={18}
                fill="currentColor"
              />

              <span className="points-number">
                {totalPoints}
              </span>

              <span className="points-unit">
                pt
              </span>
            </div>
          </div>

          <button
            className="settings-button"
            onClick={() => setShowSettings(true)}
          >
            <Settings size={21} />
          </button>
        </div>

        <div className="monthly-progress">
          <div className="progress-info">
            <span>今月の獲得</span>

            <span>
              {monthEarned >= 300 ? (
                <b className="goal-complete">
                  目標300pt 達成!
                </b>
              ) : (
                <>
                  あと <b>{300 - monthEarned}</b>ptで目標達成
                </>
              )}
            </span>
          </div>

          <ProgressBar
            value={monthEarned}
            max={300}
          />
        </div>
      </header>

<main className={`main tab-${activeTab}`}>
  <section className="tab-section tab-daily">
    <SectionHeader
      icon={<Sun size={17} />}
            title="今日のチャレンジ"
            sub={formatDateJP()}
          />

          <div className="challenge-list">
            {dailyGroups.map((group) => (
              <ChallengeGroup
                key={group.category}
                category={group.category}
                items={group.items}
                doneMap={doneToday}
                onToggle={toggleDaily}
              />
            ))}

            {dailyGroups.length === 0 && (
              <EmptyNote text="毎日のチャレンジがありません。設定から追加できます。" />
            )}
          </div>
        </section>

        <section className="tab-section tab-daily">
          <SectionHeader
            icon={<Type size={17} />}
            title="英単語（今月）"
            sub={`${vocabCount} / 300個`}
          />

          <div className="vocab-card">
            <div className="vocab-left">
              <div className="vocab-description">
                10個につき1pt
              </div>

              <ProgressBar
                value={vocabCount}
                max={300}
              />
            </div>

            <div className="vocab-buttons">
              <button
                className="minus-button"
                onClick={removeVocabSet}
              >
                −
              </button>

              <button
                className="plus-button"
                onClick={addVocabSet}
              >
                +10個
              </button>
            </div>
          </div>
        </section>

        <section className="tab-section tab-weekly">
          <SectionHeader
            icon={<Calendar size={17} />}
            title="今週のチャレンジ"
            sub={weekRangeLabel()}
          />

          <div className="challenge-list">
            {weeklyGroups.map((group) => (
              <ChallengeGroup
                key={group.category}
                category={group.category}
                items={group.items}
                doneMap={doneThisWeek}
                onToggle={toggleWeekly}
              />
            ))}

            {weeklyGroups.length === 0 && (
              <EmptyNote text="今週のチャレンジがありません。設定から追加できます。" />
            )}
          </div>
        </section>

        <section className="tab-section tab-monthly">
          <SectionHeader
            icon={<Trophy size={17} />}
            title="今月のチャレンジ"
            sub={formatMonthJP()}
          />

          <div className="challenge-list">
            {monthlyGroups.map((group) => (
              <ChallengeGroup
                key={group.category}
                category={group.category}
                items={group.items}
                doneMap={doneThisMonth}
                onToggle={toggleMonthly}
              />
            ))}

            {monthlyGroups.length === 0 && (
              <EmptyNote text="今月のチャレンジがありません。設定から追加できます。" />
            )}
          </div>
        </section>

        <section className="tab-section tab-rewards">
          <SectionHeader
            icon={<Gift size={17} />}
            title="ご褒美と交換"
          />

          <div className="reward-list">
            {rewards
              .slice()
              .sort((a, b) => a.points - b.points)
              .map((reward) => (
                <RewardRow
                  key={reward.id}
                  reward={reward}
                  totalPoints={totalPoints}
                  onRedeem={redeemReward}
                />
              ))}
          </div>
        </section>

        <section className="history-card tab-section tab-history">
          <button
            className="history-header"
            onClick={() =>
              setShowHistory((value) => !value)
            }
          >
            <span>
              <History size={17} />
              履歴
            </span>

            {showHistory ? (
              <ChevronUp size={17} />
            ) : (
              <ChevronDown size={17} />
            )}
          </button>

          {showHistory && (
            <div className="history-content">
              {transactions.length === 0 && (
                <div className="history-empty">
                  チャレンジを完了すると、ここに記録されるよ
                </div>
              )}

              {transactions
                .slice()
                .reverse()
                .slice(0, 40)
                .map((transaction) => (
                  <div
                    className="history-row"
                    key={transaction.id}
                  >
                    <span>
                      {transaction.label}
                    </span>

                    <b
                      className={
                        transaction.points >= 0
                          ? 'positive'
                          : 'negative'
                      }
                    >
                      {transaction.points >= 0
                        ? '+'
                        : ''}
                      {transaction.points}pt
                    </b>
                  </div>
                ))}
            </div>
          )}
        </section>
      </main>

      <nav className="bottom-tab-bar">

<button
  className={`bottom-tab ${activeTab === "today" ? "active" : ""}`}
  onClick={() => setActiveTab("today")}
>
  <Sun size={19} />
  <span>今日</span>
</button>

<button
  className={`bottom-tab ${activeTab === "weekly" ? "active" : ""}`}
  onClick={() => setActiveTab("weekly")}
>
  <Calendar size={19} />
  <span>毎週</span>
</button>

<button
  className={`bottom-tab ${activeTab === "monthly" ? "active" : ""}`}
  onClick={() => setActiveTab("monthly")}
>
  <Trophy size={19} />
  <span>毎月</span>
</button>

<button
  className={`bottom-tab ${activeTab === "rewards" ? "active" : ""}`}
  onClick={() => setActiveTab("rewards")}
>
  <Gift size={19} />
  <span>ご褒美</span>
</button>

<button
  className={`bottom-tab ${activeTab === "history" ? "active" : ""}`}
  onClick={() => setActiveTab("history")}
>
  <History size={19} />
  <span>履歴</span>
</button>
      </nav>

      {celebrate && (
        <div className="celebrate">
          <Sparkles size={17} />

          {celebrate.type === 'reward'
            ? `${celebrate.label}と交換した!`
            : `+${celebrate.points}pt獲得!`}
        </div>
      )}

      {showSettings && (
<SettingsPanel
  challenges={challenges}
  problems={problems}
  setProblems={setProblems}
  rewards={rewards}
          onClose={() => setShowSettings(false)}
          updateChallenge={updateChallenge}
          removeChallenge={removeChallenge}
          addChallenge={addChallenge}
          updateReward={updateReward}
          removeReward={removeReward}
          addReward={addReward}
        />
      )}
    </div>
  )
}

function SettingsPanel({
  challenges,
  problems,
  setProblems,
  rewards,
  onClose,
  updateChallenge,
  removeChallenge,
  addChallenge,
  updateReward,
  removeReward,
  addReward,
}) {

const [tab, setTab] = useState('daily')
const [newLabel, setNewLabel] = useState('')
const [newTarget, setNewTarget] = useState('')
const [newUnit, setNewUnit] = useState('問')
const [newPoints, setNewPoints] = useState('')

const labels = {
  daily: '毎日',
  weekly: '毎週',
  monthly: '毎月',
  problems: '問題',
  rewards: 'ご褒美',
}

function submitAdd() {
  console.log('①追加ボタン押された')
  console.log('②tab:', tab)
  console.log('③newLabel:', newLabel)
  console.log('④newTarget:', newTarget)
  console.log('⑤newUnit:', newUnit)
  console.log('⑥newPoints:', newPoints)

  if (!newLabel.trim()) return

  if (tab === 'rewards') {
    addReward(
      newLabel.trim(),
      newPoints
    )
} else if (tab === 'problems') {
  if (!newTarget || Number(newTarget) <= 0) return

setProblems((prev) => {
  const next = [
    ...prev,
    {
      id: `p-${Date.now()}`,
      label: newLabel.trim(),
      target: Number(newTarget),
      unit: newUnit,
      points: Number(newPoints) || 0,
      active: true,
    },
  ]

  return next
})
} else {
  addChallenge(
    tab,
    newLabel.trim(),
    newPoints
  )
}

  setNewLabel('')
  setNewTarget('')
  setNewUnit('問')
  setNewPoints('')
}

  return (
    <div className="modal-overlay">
      <div className="settings-panel">
        <div className="settings-top">
          <b>設定</b>

          <button
            className="close-button"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="settings-tabs">
          {Object.keys(labels).map((key) => (
            <button
              key={key}
              className={
                tab === key
                  ? 'active'
                  : ''
              }
              onClick={() => setTab(key)}
            >
              {labels[key]}
            </button>
          ))}
        </div>

        <div className="settings-content">
{tab !== 'rewards' &&
  tab !== 'problems' &&
  challenges[tab].map((challenge) => (
              <div
                className="setting-row"
                key={challenge.id}
              >
                <input
                  type="checkbox"
                  checked={challenge.active}
                  onChange={(event) =>
                    updateChallenge(
                      tab,
                      challenge.id,
                      {
                        active:
                          event.target.checked,
                      }
                    )
                  }
                />

                <span
                  className={
                    challenge.active
                      ? ''
                      : 'inactive'
                  }
                >
                  {challenge.label}
                </span>

                <input
                  className="number-input"
                  type="number"
                  value={challenge.points}
                  onChange={(event) =>
                    updateChallenge(
                      tab,
                      challenge.id,
                      {
                        points: Number(
                          event.target.value
                        ),
                      }
                    )
                  }
                />

                <small>pt</small>

                <button
                  className="delete-button"
                  onClick={() =>
                    removeChallenge(
                      tab,
                      challenge.id
                    )
                  }
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}

{tab === 'problems' &&
  problems.map((problem) => (
    <div
      className="setting-row"
      key={problem.id}
    >
      <input
        type="checkbox"
        checked={problem.active}
        onChange={(event) =>
          setProblems((prev) =>
            prev.map((item) =>
              item.id === problem.id
                ? {
                    ...item,
                    active: event.target.checked,
                  }
                : item
            )
          )
        }
      />

      <span
        className={
          problem.active
            ? ''
            : 'inactive'
        }
      >
        {problem.label}
      </span>

      <input
        className="number-input"
        type="number"
        value={problem.target}
        onChange={(event) =>
          setProblems((prev) =>
            prev.map((item) =>
              item.id === problem.id
                ? {
                    ...item,
                    target: Number(
                      event.target.value
                    ),
                  }
                : item
            )
          )
        }
      />

      <small>{problem.unit}</small>

      <input
        className="number-input"
        type="number"
        value={problem.points}
        onChange={(event) =>
          setProblems((prev) =>
            prev.map((item) =>
              item.id === problem.id
                ? {
                    ...item,
                    points: Number(
                      event.target.value
                    ),
                  }
                : item
            )
          )
        }
      />

      <small>pt</small>

      <button
        className="delete-button"
        onClick={() =>
          setProblems((prev) =>
            prev.filter(
              (item) => item.id !== problem.id
            )
          )
        }
      >
        <Trash2 size={16} />
      </button>
    </div>
  ))}

{tab === 'rewards' &&
  rewards.map((reward) => (
    <div
      className="setting-row"
      key={reward.id}
    >
      <span>
        {reward.label}
      </span>

      <input
        className="number-input reward-number"
        type="number"
        value={reward.points}
        onChange={(event) =>
          updateReward(
            reward.id,
            {
              points: Number(
                event.target.value
              ),
            }
          )
        }
      />

      <small>pt</small>

      <button
        className="delete-button"
        onClick={() =>
          removeReward(reward.id)
        }
      >
        <Trash2 size={16} />
      </button>
    </div>
  ))}

          <div className="add-area">
            <div className="add-title">
              {tab === 'rewards'
                ? 'ご褒美を追加'
                : 'チャレンジを追加'}
            </div>

<div className="add-form">
  <input
    placeholder={
      tab === 'problems'
        ? '問題名'
        : '内容'
    }
    value={newLabel}
    onChange={(event) =>
      setNewLabel(event.target.value)
    }
  />

  {tab === 'problems' && (
    <>
      <input
        className="number-input"
        placeholder="目標数"
        type="number"
        min="1"
        value={newTarget}
        onChange={(event) =>
          setNewTarget(event.target.value)
        }
      />

      <input
        className="unit-input"
        placeholder="単位"
        value={newUnit}
        onChange={(event) =>
          setNewUnit(event.target.value)
        }
      />
    </>
  )}

  <input
    placeholder="pt"
    type="number"
    min="0"
    value={newPoints}
    onChange={(event) =>
      setNewPoints(event.target.value)
    }
  />

  <button
    onClick={submitAdd}
  >
    <Plus size={18} />
  </button>
</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
