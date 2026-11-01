import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SettingsLimits, Theme, Voice } from '@wordmap/shared'
import { Segmented, Stepper, Surface, TopBar } from '../../design/primitives'
import { Typo } from '../../design/typography'
import { RoutePath } from '../../app/routes'
import { useTheme } from '../../app/theme/useTheme'
import { useAppStore } from '../../store'
import { Notice, NoticeTone, SettingsCopy, SettingsFiles } from './SettingsSupport'
import { SettingsTestId } from './SettingsTestId'
import { FontSize, FontWeight, Gap, Inset, Layer, Leading, Radius, Size } from '../../design/scale'
import { Motion } from '../../design/styleValues'

const SCREEN: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'var(--bg)',
  display: 'flex',
  flexDirection: 'column',
  zIndex: Layer.L4,
  animation: Motion.A_wmIn_220ms_ease_out,
}

const BODY: CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: Inset.I8_20_20,
  display: 'flex',
  flexDirection: 'column',
  gap: Gap.G16,
}

const ROW_TEXT: CSSProperties = { font: Typo.sans(FontWeight.Regular, FontSize.F16) }

function SettingRow({ height, last, children }: { height: number; last?: boolean; children: ReactNode }) {
  const style: CSSProperties = {
    height,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: last ? undefined : '1px solid var(--border)',
  }
  return <div style={style}>{children}</div>
}

interface ActionRowProps {
  label: string
  tone?: string
  last?: boolean
  testId: string
  onClick: () => void
}

function ActionRow({ label, tone = 'var(--brand)', last, testId, onClick }: ActionRowProps) {
  const style: CSSProperties = {
    height: Size.S56,
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    textAlign: 'left',
    font: ROW_TEXT.font,
    color: tone,
    borderBottom: last ? undefined : '1px solid var(--border)',
  }
  return (
    <button type="button" style={style} data-testid={testId} onClick={onClick}>
      {label}
    </button>
  )
}

function NameField() {
  const saved = useAppStore(s => s.settings.learnerName ?? '')
  const update = useAppStore(s => s.updateSettings)
  const settled = useAppStore(s => s.sync.lastSyncAt !== null || !s.sync.online || s.sync.lastError !== null)
  const [draft, setDraft] = useState(saved)
  useEffect(() => setDraft(saved), [saved])
  const commit = () => {
    const next = SettingsLimits.learnerName(draft)
    setDraft(next)
    if (next !== saved) void update({ learnerName: next })
  }
  const style: CSSProperties = {
    font: Typo.sans(FontWeight.Medium, FontSize.F16),
    color: 'var(--text)',
    background: 'var(--tint)',
    border: 0,
    borderRadius: Radius.R8,
    padding: Inset.I6_8,
    height: Size.S44,
    boxSizing: 'border-box',
    width: Size.S160,
    textAlign: 'right',
  }
  return (
    <input
      id={SettingsTestId.Name}
      data-testid={SettingsTestId.Name}
      type="text"
      value={draft}
      disabled={!settled}
      maxLength={SettingsCopy.NAME_MAX}
      placeholder={SettingsCopy.NAME_PLACEHOLDER}
      autoComplete="given-name"
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      style={style}
    />
  )
}

function PreferencesCard() {
  const settings = useAppStore(s => s.settings)
  const update = useAppStore(s => s.updateSettings)
  const { preference, setPreference } = useTheme()
  const pickTheme = (theme: Theme) => {
    setPreference(SettingsCopy.themePreference(theme))
    void update({ theme })
  }
  return (
    <Surface padding="4px 16px">
      <SettingRow height={60}>
        <label htmlFor={SettingsTestId.Name} style={ROW_TEXT}>{SettingsCopy.NAME}</label>
        <NameField />
      </SettingRow>
      <SettingRow height={60}>
        <span style={ROW_TEXT}>{SettingsCopy.DAILY}</span>
        <Stepper
          value={settings.dailyNew}
          min={SettingsCopy.DAILY_MIN}
          max={SettingsCopy.DAILY_MAX}
          label={SettingsCopy.DAILY}
          testId={SettingsTestId.Daily}
          onChange={dailyNew => void update({ dailyNew })}
        />
      </SettingRow>
      <SettingRow height={60}>
        <span style={ROW_TEXT}>{SettingsCopy.THEME}</span>
        <Segmented options={SettingsCopy.THEMES} value={SettingsCopy.themeOf(preference)} label={SettingsCopy.THEME} onChange={pickTheme} itemTestId={v => `${SettingsTestId.ThemePrefix}${v}`} />
      </SettingRow>
      <SettingRow height={60}>
        <span style={ROW_TEXT}>{SettingsCopy.VOICE}</span>
        <Segmented<Voice> options={SettingsCopy.VOICES} value={settings.voice} label={SettingsCopy.VOICE} itemPadding="6px 12px" onChange={voice => void update({ voice })} itemTestId={v => `${SettingsTestId.VoicePrefix}${v}`} />
      </SettingRow>
      <SettingRow height={60} last>
        <label htmlFor={SettingsTestId.Reminder} style={ROW_TEXT}>{SettingsCopy.REMINDER}</label>
        <input
          id={SettingsTestId.Reminder}
          data-testid={SettingsTestId.Reminder}
          type="time"
          value={settings.reminderTime ?? ''}
          onChange={e => void update({ reminderTime: e.target.value })}
          style={{ font: Typo.sans(FontWeight.Medium, FontSize.F16), color: 'var(--text)', background: 'var(--tint)', border: 0, borderRadius: Radius.R8, padding: Inset.I6_8, height: Size.S44, boxSizing: 'border-box', fontVariantNumeric: 'tabular-nums' }}
        />
      </SettingRow>
    </Surface>
  )
}

function useDataActions(report: (notice: Notice) => void) {
  const store = useAppStore.getState
  const navigate = useNavigate()
  const guard = async (task: () => Promise<void>, okText: string): Promise<boolean> => {
    try {
      await task()
      report({ tone: NoticeTone.Ok, text: okText })
      return true
    } catch (error) {
      report({ tone: NoticeTone.Error, text: SettingsCopy.errorText(error) })
      return false
    }
  }
  const exportJson = () => guard(async () => SettingsFiles.download(await store().exportJson(), store().today), SettingsCopy.EXPORTED)
  const importFile = async (file: File) => {
    if (!window.confirm(SettingsCopy.IMPORT_CONFIRM)) return
    await guard(async () => store().importData(await SettingsFiles.read(file)), SettingsCopy.IMPORTED)
  }
  const reset = async () => {
    if (!window.confirm(SettingsCopy.RESET_CONFIRM)) return
    const done = await guard(() => store().resetProgress(), SettingsCopy.RESET_DONE)
    if (done) navigate(RoutePath.Today)
  }
  return { exportJson, importFile, reset, retake: () => navigate(RoutePath.Placement) }
}

function DataCard({ report }: { report: (notice: Notice) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const actions = useDataActions(report)
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) await actions.importFile(file)
  }
  return (
    <Surface padding="4px 16px">
      <ActionRow label={SettingsCopy.EXPORT} testId={SettingsTestId.Export} onClick={() => void actions.exportJson()} />
      <ActionRow label={SettingsCopy.IMPORT} testId={SettingsTestId.Import} onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept={SettingsCopy.FILE_ACCEPT} hidden data-testid={SettingsTestId.ImportFile} onChange={e => void onFile(e)} />
      <ActionRow label={SettingsCopy.RETAKE} testId={SettingsTestId.Retake} onClick={actions.retake} />
      <ActionRow label={SettingsCopy.RESET} tone="var(--again)" last testId={SettingsTestId.Reset} onClick={() => void actions.reset()} />
    </Surface>
  )
}

function NoticeLine({ notice }: { notice: Notice | null }) {
  if (!notice) return null
  const color = notice.tone === NoticeTone.Error ? 'var(--again)' : 'var(--muted)'
  return (
    <div role="status" data-testid={SettingsTestId.Notice} data-tone={notice.tone} style={{ font: Typo.sans(FontWeight.Regular, FontSize.F14), color, padding: Inset.I0_4 }}>
      {notice.text}
    </div>
  )
}

/** Settings overlay reached from Progress: preferences, data tools, reset and credits. */
export function SettingsScreen() {
  const navigate = useNavigate()
  const [notice, setNotice] = useState<Notice | null>(null)
  return (
    <div style={SCREEN} className="wm-anim" data-testid={SettingsTestId.Screen}>
      <TopBar backLabel={SettingsCopy.BACK} backTestId={SettingsTestId.Back} onBack={() => navigate(RoutePath.Progress)} />
      <div style={BODY}>
        <span style={{ font: Typo.sans(FontWeight.Semibold, FontSize.F22, Leading.L28) }}>{SettingsCopy.TITLE}</span>
        <PreferencesCard />
        <DataCard report={setNotice} />
        <NoticeLine notice={notice} />
        <Surface padding="4px 16px">
          <ActionRow label={SettingsCopy.CREDITS} tone="var(--text)" last testId={SettingsTestId.Credits} onClick={() => navigate(RoutePath.Credits)} />
        </Surface>
      </div>
    </div>
  )
}
