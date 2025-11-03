import { AnimatePresence, motion } from "framer-motion";

export function DemoToast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2"
        >
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm text-emerald-200 shadow-lg">
            📄 {message}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
