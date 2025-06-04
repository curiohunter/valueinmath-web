import React from 'react';

interface GoogleCalendarEmbedProps {
  /**
   * 구글 캘린더 embed URL (필수)
   * 예시: https://calendar.google.com/calendar/embed?src=...&ctz=Asia%2FSeoul
   */
  src?: string;
  /**
   * iframe 가로(px), 기본값 800
   */
  width?: number | string;
  /**
   * iframe 세로(px), 기본값 600
   */
  height?: number | string;
  /**
   * 추가 스타일
   */
  style?: React.CSSProperties;
  /**
   * iframe title (접근성)
   */
  title?: string;
}

/**
 * 구글 캘린더를 iframe으로 삽입하는 컴포넌트입니다.
 * src, width, height, style을 prop으로 받아 재사용할 수 있습니다.
 */
const GoogleCalendarEmbed: React.FC<GoogleCalendarEmbedProps> = ({
  src = 'https://calendar.google.com/calendar/embed?src=c_6edb93aebb85915e7af73ada65813638d47da235dc6a0a758ebb596357fb9a64%40group.calendar.google.com&ctz=Asia%2FSeoul',
  width = 800,
  height = 600,
  style = {},
  title = 'Google Calendar',
}) => {
  return (
    <div className="w-full flex justify-center">
      <iframe
        src={src}
        style={{ border: 0, ...style }}
        width={width}
        height={height}
        frameBorder={0}
        scrolling="no"
        title={title}
        allowFullScreen
      />
    </div>
  );
};

export default GoogleCalendarEmbed; 