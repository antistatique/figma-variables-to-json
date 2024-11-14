import { viteSingleFile } from "vite-plugin-singlefile"

export default {
  build: {
    outDir: 'dist/ui'
  },
  plugins: [viteSingleFile()]
}