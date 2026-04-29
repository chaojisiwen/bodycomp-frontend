declare module 'libheif-js' {
  interface HeifImage {
    get_width(): number
    get_height(): number
    display(
      options: { data: Uint8ClampedArray; width: number; height: number },
      callback: (result: { data: Uint8ClampedArray } | null) => void
    ): void
  }

  interface HeifDecoderInstance {
    decode(buffer: ArrayBuffer): HeifImage[]
  }

  interface LibheifNamespace {
    HeifDecoder: {
      new(): HeifDecoderInstance
    }
  }

  const libheif: LibheifNamespace
  export = libheif
}
