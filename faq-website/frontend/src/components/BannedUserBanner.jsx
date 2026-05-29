import { motion } from 'framer-motion';
import { ShieldOff } from 'lucide-react';

/**
 * Compact floating overlay bubble — top-center of viewport.
 * Does NOT affect layout grid or push dashboard content.
 * Same message, same pastel-rose moderation aesthetic.
 */
export default function BannedUserBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="banned-banner-fixed"
    >
      <div className="banned-banner-pill">
        <ShieldOff size={13} strokeWidth={2.5} className="banned-banner-icon" />
        <p className="banned-banner-text">
          <strong>Account restricted —</strong> some platform features may be limited.
        </p>
      </div>
    </motion.div>
  );
}