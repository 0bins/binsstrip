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
`config.js`에 연결된 공개 탭에서 일정, 장소 안내, 긴급정보, 여행 회화, 여행 준비 데이터를 가져옵니다.

## 현재 포함 기능
- 오늘 일정 자동 표시
- 전체 일정 DAY별 보기
- DAY 5 일정 준비 중 표시
- 장소 가이드
- 대만 기본 회화 + 복사 버튼
- PWA용 서비스워커(기본 오프라인 캐시)
- 민감정보 제외 원칙
