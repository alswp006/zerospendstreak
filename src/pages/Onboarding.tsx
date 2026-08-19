import { useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Top, Paragraph, Spacing, TextField, Button, Toast } from '@toss/tds-mobile';
import { generateHapticFeedback } from '@apps-in-toss/web-framework';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { Card } from '@/components/Card';
import { useProfile } from '@/hooks/useProfile';

const NICKNAME_MIN_LENGTH = 2;
const NICKNAME_MAX_LENGTH = 10;
const HELP_INVALID = '닉네임을 2~10자로 입력해주세요';
const TOAST_STORAGE_FULL = '저장 공간이 부족해요. 오래된 기록을 정리해주세요';

// SDK는 WebView 밖(브라우저/검수자 PC/jsdom)에서 throw하므로 가드 필수 — 흰 화면 방지.
function fireStartHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: 'success' })).catch(() => {});
  } catch {
    /* no-op */
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { setNickname, markOnboarded } = useProfile();
  const [nickname, setNicknameInput] = useState('');
  const [toastOpen, setToastOpen] = useState(false);

  const trimmedLength = nickname.trim().length;
  const isValid = trimmedLength >= NICKNAME_MIN_LENGTH && trimmedLength <= NICKNAME_MAX_LENGTH;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNicknameInput(e.target.value.slice(0, NICKNAME_MAX_LENGTH));
    setToastOpen(false);
  };

  const handleStart = () => {
    if (!isValid) return;
    const result = setNickname(nickname);
    if (!result.ok) {
      if (result.reason === 'STORAGE_FULL') setToastOpen(true);
      return;
    }
    fireStartHaptic();
    markOnboarded();
    navigate('/', { replace: true });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>하루 0원, 시작해볼까요?</Top.TitleParagraph>} />}
      bottom={
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px calc(var(--toss-safe-area-bottom) + 12px)',
            backgroundColor: 'var(--adaptiveBackground)',
          }}
        >
          <Button
            variant="fill"
            size="large"
            display="block"
            disabled={!isValid}
            onClick={handleStart}
            data-testid="onboarding-start"
          >
            시작하기
          </Button>
        </div>
      }
    >
      <Spacing size={16} />
      <Card>
        <Paragraph.Text typography="t5">지출 0원인 날을 체크하면</Paragraph.Text>
        <Paragraph.Text typography="t5">스트릭이 쌓여요</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st11" color="secondary">
          기록은 이 기기에만 저장돼요. 랭킹에 참여하면 닉네임과 스트릭만 공유돼요.
        </Paragraph.Text>
      </Card>
      <Spacing size={24} />
      <TextField
        variant="box"
        label="닉네임"
        placeholder="예: 제로소비왕"
        help={isValid ? '2~10자로 입력할 수 있어요' : HELP_INVALID}
        hasError={!isValid}
        value={nickname}
        onChange={handleChange}
      />
      <Spacing size={96} />
      <Toast open={toastOpen} text={TOAST_STORAGE_FULL} position="bottom" />
    </ScreenScaffold>
  );
}
