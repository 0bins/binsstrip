# 2026 대만 가족여행 모바일 가이드

## GitHub 계정
여행용 새 계정을 만들 필요 없습니다.
기존 GitHub 계정에 `taiwan-family-trip` 같은 public repository 하나를 만들면 됩니다.

## 배포
1. GitHub에서 public repository 생성
2. 이 폴더의 파일을 전부 업로드
3. Settings → Pages
4. Deploy from a branch
5. main / root 선택
6. 저장 후 생성된 주소 접속

## Google Sheets 연결
현재는 로컬 예시 일정으로 동작합니다.
나중에 `WEB_SCHEDULE`, `WEB_EXPENSE`, `WEB_INFO` 공개용 탭을 만들고 `config.js`에 CSV URL을 연결하면,
시트 수정 → 웹 새로고침으로 최신 데이터 표시가 가능하게 확장할 수 있습니다.

## 현재 포함 기능
- 오늘 일정 자동 표시
- 전체 일정 DAY별 보기
- DAY 5 일정 준비 중 표시
- 장소 가이드
- 대만 기본 회화 + 복사 버튼
- 지출 현황 영역
- PWA용 서비스워커(기본 오프라인 캐시)
- 민감정보 제외 원칙
