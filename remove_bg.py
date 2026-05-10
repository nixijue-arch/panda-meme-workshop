from PIL import Image
import os

def remove_white_bg(input_path, output_path, threshold=240):
    """Remove white background from image, convert to transparent PNG"""
    img = Image.open(input_path).convert('RGBA')
    data = img.getdata()
    
    new_data = []
    for item in data:
        r, g, b, a = item
        # If pixel is close to white (all channels above threshold), make it transparent
        if r > threshold and g > threshold and b > threshold:
            new_data.append((255, 255, 255, 0))
        else:
            # Keep original alpha, but ensure non-white pixels are fully opaque
            new_data.append((r, g, b, 255))
    
    img.putdata(new_data)
    img.save(output_path, 'PNG')
    print(f"Saved: {output_path}")

assets_dir = '/mnt/agents/output/app/public/assets'

# Remove background from all face images
for i in range(1, 16):
    face_file = f'face-{i:02d}.png'
    input_path = os.path.join(assets_dir, face_file)
    if os.path.exists(input_path):
        remove_white_bg(input_path, input_path)
        print(f"Processed: {face_file}")

# Also process panda head (keep its white face, only remove outer white border)
panda_path = os.path.join(assets_dir, 'panda-head.png')
if os.path.exists(panda_path):
    remove_white_bg(panda_path, panda_path)
    print("Processed: panda-head.png")

print("All assets processed!")
