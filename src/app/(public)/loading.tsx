export default function ParsLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a365d] to-[#0f172a]">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-[#d4a843]" />
        <p className="text-sm text-gray-400">Yukleniyor...</p>
      </div>
    </div>
  );
}
