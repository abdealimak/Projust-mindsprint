import React from 'react';

export function GeometricArt() {
  return (
    <div className="w-full max-w-[540px] aspect-square rounded-3xl overflow-hidden bg-black p-4 shadow-2xl border border-neutral-800">
      <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1.5 p-2 bg-[#09090b] rounded-2xl">
        {/* Row 1 */}
        {/* 1,1: Solid circle */}
        <div className="relative flex items-center justify-center bg-[#18181b] rounded-lg overflow-hidden">
          <div className="w-4/5 h-4/5 rounded-full bg-white" />
        </div>
        {/* 1,2: Quarter circle top-right */}
        <div className="relative bg-[#1c1917] rounded-lg overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-full bg-[#52525b] rounded-tr-full" />
        </div>
        {/* 1,3: Quarter circle inverted */}
        <div className="relative bg-[#27272a] rounded-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-white rounded-bl-full" />
        </div>
        {/* 1,4: Split diagonal triangle */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-neutral-400 [clip-path:polygon(0_0,100%_100%,0_100%)]" />
        </div>
        {/* 1,5: Quarter circle top-left */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute bottom-0 right-0 w-full h-full bg-[#3f3f46] rounded-tl-full" />
        </div>
        {/* 1,6: Quarter circle top-right */}
        <div className="relative bg-[#27272a] rounded-lg overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-full bg-[#71717a] rounded-tr-full" />
        </div>

        {/* Row 2 */}
        {/* 2,1: 4 dots in 2x2 grid */}
        <div className="grid grid-cols-2 grid-rows-2 gap-2 p-2.5 bg-[#18181b] rounded-lg">
          <div className="rounded-full bg-white" />
          <div className="rounded-full bg-white" />
          <div className="rounded-full bg-white" />
          <div className="rounded-full bg-white" />
        </div>
        {/* 2,2: Diamond in square */}
        <div className="relative flex items-center justify-center bg-[#27272a] rounded-lg overflow-hidden">
          <div className="w-3/5 h-3/5 bg-white rotate-45 transform" />
        </div>
        {/* 2,3: Half arch */}
        <div className="relative bg-[#3f3f46] rounded-lg overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-white rounded-t-full" />
        </div>
        {/* 2,4: Diagonal stripe */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute -inset-1 bg-[#52525b] rotate-45 transform origin-center" />
        </div>
        {/* 2,5: Nested diamond */}
        <div className="relative flex items-center justify-center bg-[#18181b] rounded-lg">
          <div className="w-4/5 h-4/5 border-2 border-neutral-500 rotate-45 flex items-center justify-center">
            <div className="w-1/2 h-1/2 bg-neutral-400" />
          </div>
        </div>
        {/* 2,6: Diagonal angled bar */}
        <div className="relative bg-[#09090b] rounded-lg overflow-hidden flex items-center justify-center">
          <div className="w-3/5 h-[120%] bg-white -rotate-30 transform" />
        </div>

        {/* Row 3 */}
        {/* 3,1: Diagonal split */}
        <div className="relative bg-[#27272a] rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-[#09090b] [clip-path:polygon(100%_0,0_100%,100%_100%)]" />
        </div>
        {/* 3,2: 3x3 dot matrix */}
        <div className="grid grid-cols-3 grid-rows-3 gap-1.5 p-2 bg-[#18181b] rounded-lg">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-full bg-[#71717a]" />
          ))}
        </div>
        {/* 3,3: Big square inside */}
        <div className="flex items-center justify-center bg-[#3f3f46] rounded-lg">
          <div className="w-3/5 h-3/5 bg-[#18181b] rounded-sm" />
        </div>
        {/* 3,4: Concentric circle cutout */}
        <div className="relative flex items-center justify-center bg-[#27272a] rounded-lg">
          <div className="w-4/5 h-4/5 rounded-full border-4 border-neutral-600 flex items-center justify-center">
            <div className="w-2/5 h-2/5 rounded-full bg-neutral-300" />
          </div>
        </div>
        {/* 3,5: Corner diagonal wedge */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute top-0 right-0 w-full h-full bg-[#52525b] rounded-bl-full" />
        </div>
        {/* 3,6: Solid charcoal */}
        <div className="bg-[#27272a] rounded-lg" />

        {/* Row 4 */}
        {/* 4,1: Triangle corner */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-white [clip-path:polygon(0_0,100%_0,0_100%)]" />
        </div>
        {/* 4,2: Solid black with diagonal cut */}
        <div className="relative bg-[#09090b] rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-[#3f3f46] [clip-path:polygon(0_0,100%_100%,100%_0)]" />
        </div>
        {/* 4,3: Solid dark slate */}
        <div className="bg-[#18181b] rounded-lg" />
        {/* 4,4: Projust Arrow Glyph tile (similar to the logo in inspo!) */}
        <div className="flex items-center justify-center bg-neutral-300 text-black rounded-lg">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M7 17L17 7M17 7H9M17 7V15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        {/* 4,5: Dual diamond overlay */}
        <div className="relative flex items-center justify-center bg-[#18181b] rounded-lg">
          <div className="w-1/2 h-1/2 bg-neutral-600 rotate-45" />
          <div className="w-1/2 h-1/2 bg-neutral-400 rotate-45 -translate-x-1" />
        </div>
        {/* 4,6: Concentric circles with center dot */}
        <div className="relative flex items-center justify-center bg-[#27272a] rounded-lg">
          <div className="w-3/4 h-3/4 rounded-full border-2 border-neutral-400 flex items-center justify-center">
            <div className="w-1/3 h-1/3 rounded-full bg-neutral-200" />
          </div>
        </div>

        {/* Row 5 */}
        {/* 5,1: Pure white square */}
        <div className="bg-white rounded-lg" />
        {/* 5,2: Inverted corner */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute bottom-0 right-0 w-full h-full bg-[#52525b] rounded-tl-full" />
        </div>
        {/* 5,3: L-bracket shape */}
        <div className="relative bg-[#18181b] rounded-lg p-2">
          <div className="w-full h-full border-l-4 border-b-4 border-white" />
        </div>
        {/* 5,4: Slanted white bar */}
        <div className="relative bg-[#09090b] rounded-lg overflow-hidden flex items-center justify-center">
          <div className="w-2/5 h-full bg-white rotate-12 transform" />
        </div>
        {/* 5,5: Concentric curved arcs */}
        <div className="relative flex flex-col justify-center items-center gap-1 bg-[#18181b] rounded-lg">
          <div className="w-4/5 h-2 rounded-full bg-neutral-400" />
          <div className="w-3/5 h-2 rounded-full bg-neutral-500" />
          <div className="w-2/5 h-2 rounded-full bg-neutral-600" />
        </div>
        {/* 5,6: Two parallel pill bars */}
        <div className="flex flex-col justify-center items-center gap-1.5 bg-[#09090b] rounded-lg">
          <div className="w-3/4 h-2.5 rounded-full bg-white" />
          <div className="w-3/4 h-2.5 rounded-full bg-white" />
        </div>

        {/* Row 6 */}
        {/* 6,1: Circle arch */}
        <div className="relative bg-[#27272a] rounded-lg overflow-hidden">
          <div className="absolute inset-0 rounded-full border-4 border-neutral-600" />
        </div>
        {/* 6,2: Quarter circle bottom-right */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[#71717a] rounded-br-full" />
        </div>
        {/* 6,3: Diamond */}
        <div className="flex items-center justify-center bg-[#09090b] rounded-lg">
          <div className="w-1/2 h-1/2 bg-neutral-400 rotate-45" />
        </div>
        {/* 6,4: Leaf shape */}
        <div className="relative bg-[#18181b] rounded-lg overflow-hidden">
          <div className="w-full h-full bg-neutral-400 rounded-tr-3xl rounded-bl-3xl" />
        </div>
        {/* 6,5: Wave lines */}
        <div className="flex items-center justify-center bg-[#18181b] rounded-lg">
          <div className="w-3/5 h-3/5 border-2 border-neutral-500 rounded-lg rotate-12" />
        </div>
        {/* 6,6: 6-dot matrix */}
        <div className="grid grid-cols-3 grid-rows-2 gap-1.5 p-2 bg-[#27272a] rounded-lg">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-full bg-white" />
          ))}
        </div>
      </div>
    </div>
  );
}
