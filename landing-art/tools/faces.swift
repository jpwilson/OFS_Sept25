// Prints face boxes for each image as JSON lines: {"file":..., "w":..., "h":..., "faces":[[x,y,w,h] in 0..1, top-left origin]}
import Foundation
import Vision
import AppKit
for path in CommandLine.arguments.dropFirst() {
  guard let img = NSImage(contentsOfFile: path), let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
  let req = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: cg, options: [:]).perform([req])
  let faces = (req.results ?? []).map { r -> [Double] in
    let b = r.boundingBox
    return [Double(b.origin.x), Double(1 - b.origin.y - b.size.height), Double(b.size.width), Double(b.size.height)]
  }
  let obj: [String: Any] = ["file": path, "w": cg.width, "h": cg.height, "faces": faces]
  let data = try! JSONSerialization.data(withJSONObject: obj)
  print(String(data: data, encoding: .utf8)!)
}
