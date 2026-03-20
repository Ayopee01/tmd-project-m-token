export type Props = {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    /** ถ้า true: จอใหญ่ก็คลิกที่รูปเพื่อซูมได้ (default: false) */
    clickAnywhereOnDesktop?: boolean;
};