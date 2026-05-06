/**
 * Pre-written Urdu translations for course content.
 * Simple, clear Urdu that is easy to understand.
 */

export interface Translation {
  slug: string;
  title: string;
  urduTitle: string;
  content: string;
  urduContent: string;
}

export const translations: Translation[] = [
  {
    slug: '/',
    title: 'Physical AI & Humanoid Robotics',
    urduTitle: 'فزیکل اے آئی اور ہیومینوئڈ روبوٹکس',
    content: `Welcome to this comprehensive course on **Physical AI and Humanoid Robotics**. This course bridges the gap between artificial intelligence theory and real-world robotic applications, preparing you to understand and work with the next generation of intelligent machines.`,
    urduContent: `**فزیکل اے آئی اور ہیومینوئڈ روبوٹکس** کے اس جامع کورس میں خوش آمدید۔ یہ کورس مصنوعی ذہانت کے نظریات اور حقیقی دنیا کے روبوٹک ایپلیکیشنز کے درمیان پل بناتا ہے۔`,
  },
  {
    slug: 'week-01/module-01/introduction',
    title: 'Introduction to Physical AI',
    urduTitle: 'فزیکل اے آئی کا تعارف',
    content: `# Introduction to Physical AI

Physical AI represents a fundamental shift in how we think about artificial intelligence. While traditional AI operates in the digital realm—processing text, images, and data—Physical AI extends into the real world, enabling machines to perceive, reason about, and interact with their physical environment.

**Physical AI** refers to artificial intelligence systems that exist in and interact with the physical world. Unlike traditional AI that processes digital data in isolated computer systems, Physical AI bridges the digital and physical realms, allowing machines to understand and act upon real-world sensory inputs.

The key characteristics of Physical AI include:

1. **Sensory Perception**: The ability to perceive the environment through sensors like cameras, microphones, and tactile sensors.

2. **Embodied Intelligence**: Intelligence that is connected to a physical body, enabling learning through interaction with the real world.

3. **Real-time Decision Making**: The capability to make quick decisions based on current environmental conditions.

4. **Physical Interaction**: The ability to manipulate objects and navigate through physical spaces.

## Why Physical AI Matters

Physical AI is transforming industries from manufacturing to healthcare:

- **Manufacturing**: Robots that can adapt to changing conditions on the factory floor
- **Healthcare**: Surgical robots that can perform minimally invasive procedures with unprecedented precision
- **Agriculture**: Autonomous systems that can monitor crop health and harvest produce
- **Logistics**: Warehouse robots that can navigate complex environments and handle diverse tasks

## The Road Ahead

Physical AI is advancing rapidly, driven by:

- **Better Sensors** — Cheaper, more accurate, more diverse sensing technologies give robots richer perceptions of the world.

- **Faster Computers** — Moore's Law may be slowing, but specialized AI hardware is accelerating.

- **Better Algorithms** — New approaches to perception, planning, and control are enabling more capable robots.

- **More Data** — The explosion of robotics data is enabling machine learning at scale.

This course will give you the foundation you need to understand and work with Physical AI systems.`,
    urduContent: `# فزیکل اے آئی کا تعارف

فزیکل اے آئی مصنوعی ذہانت کے بارے میں ہمارے سوچنے کا ایک بنیادی تغیر ہے۔ جبکہ روایتی اے آئی ڈیجیٹل دنیا میں کام کرتا ہے، فزیکل اے آئی حقیقی دنیا میں پھیلا ہوا ہے۔

**فزیکل اے آئی** وہ مصنوعی ذہانت کے نظام ہیں جو حقیقی دنیا میں موجود ہیں اور اس سے رابطہ کرتے ہیں۔

## فزیکل اے آئی کی اہم خصوصیات

1. **سینسری پرسپشن**: ماحول کو سمجھنے کی صلاحیت کیمرے، مائیکروفون اور ٹیکٹائل سینسرز کے ذریعے۔

2. **جسمانی ذہانت**: ایک جسمانی جسم سے جڑی ہوئی جو حقیقی دنیا سے رابطے کے ذریعے سیکھتی ہے۔

3. **حقیقی وقت میں فیصلہ**: موجودہ ماحولیاتی حالات کی بنیاد پر جلد فیصلے کرنے کی صلاحیت۔

4.**: جسمانی تعامل**: اشیاء کو چلانے اور جسمانی جگہوں میں نیویگیٹ کرنے کی صلاحیت۔

## فزیکل اے آئی کیوں اہم ہے

فزیکل اے آئی مختلف صنعتوں کو تبدیل کر رہا ہے:

- **مینوفیکچرنگ**: فیکٹری میں بدلتے ہوئے حالات کے مطابق ڈھل سکنے والے روبوٹ۔

- **ہیلتھ کیئر**: کم سے کم entered طریقے سے سرجری کرنے والے روبوٹ۔

- **زراعت**: فصلوں کی صحت کی نگرانی کرنے والے خودکار نظام۔

- **لوجسٹکس**: پیچیدہ ماحول میں نیویگیٹ کرنے والے روبوٹ۔`,
  },
  {
    slug: 'week-01/module-01/embodied-ai',
    title: 'Embodied AI and Intelligence',
    urduTitle: 'جسمانی اے آئی اور ذہانت',
    content: `# Embodied AI and Intelligence

The concept of embodied intelligence suggests that intelligence is not just about processing information in an abstract computational substrate, but is deeply connected to having a physical presence in the world.

## The Embodied Cognition Hypothesis

According to embodied cognition theories, our understanding of concepts is grounded in our physical experiences. We understand "hot" because we've felt heat, "up" because we've experienced gravity, and "push" because we've pushed things.

This has profound implications for AI:

1. **Contextual Understanding**: An embodied system understands concepts in the context of physical experience, not just abstract symbols.

2. **Adaptive Learning**: Physical systems can learn from interaction with the environment, adapting to new situations.

3. **Robustness**: Embodied systems are often more robust to perturbations because they can use multiple sensory modalities.

## Physical AI vs Traditional AI

Traditional AI focuses on processing information—manipulating symbols, finding patterns in data, and making decisions based on rules or learned models.

Physical AI goes beyond this to include:

- **Perception**: Interpreting sensory data from the world
- **Action**: Executing physical movements in the real world
- **Interaction**: Responding to and influencing the environment

## The Body-Brain Relationship

In biological systems, the relationship between body and brain is bidirectional:

- The brain controls the body's actions
- The body's experiences shape the brain's development and organization

This suggests that for Artificial General Intelligence (AGI) to reach human-level capabilities, it may need to be embodied.`,
    urduContent: `# جسمانی اے آئی اور ذہانت

جسمانی ذہانت کا تصور بتاتا ہے کہ ذہانت صرف معلومات کو پراسس کرنے کے بارے میں نہیں، بلکہ یہ دنیا میں جسمانی موجودگی سے گہری جڑی ہوئی ہے۔

## جسمانی Cognition کا نظریہ

جسمانی cognition نظریات کے مطابق، ہمارا تصورات کو سمجھنا ہمارے جسمانی تجربو�ات پر مبنی ہے۔ ہم "گرم" کو سمجھتے ہیں کیونکہ ہم نے گرمی محسوس کی ہے۔

## روایتی اے آئی بمقابلہ فزیکل اے آئی

**روائتی اے آئی**: معلومات کو پراسس کرنے پر مرکوز۔

**فزیکل اے آئی**: اس سے آگے جاکر شامل کرتا ہے:
- **پرسپشن**: دنیا سے سینسری ڈیٹا کی تفسیر۔
- **ایکشن**: حقیقی دنیا میں جسمانی حرکات۔
- **تعامل**: ماحول کا جواب دینا اور متاثر کرنا۔

## جسم اور دماغ کا تعلق

جانداروں میں جسم اور دماغ کا تعلق دو طرفہ ہے:
- دماغ جسم کی حرکات کو کنٹرول کرتا ہے۔
- جسم کے تجربے دماغ کی ترقی کو شکل دیتے ہیں۔`,
  },
  {
    slug: 'week-02/module-01/sensors-overview',
    title: 'Robot Sensors Overview',
    urduTitle: 'روبوٹ سینسرز کا جائزہ',
    content: `# Robot Sensors Overview

Sensors are the eyes, ears, and fingertips of a robot. They allow robots to perceive their environment and gather the data needed for decision-making.

## Types of Robot Sensors

### Visual Sensors (Vision)
- **Cameras**: Capture images and video of the environment
- **Depth Cameras**: Provide both color and depth information
- **LiDAR**: Uses laser pulses to measure distance and create 3D maps

### Proximity Sensors
- **Infrared**: Detect objects without physical contact
- **Ultrasonic**: Use sound waves to measure distance
- **Touch Sensors**: Detect physical contact

### Inertial Sensors
- **Accelerometers**: Measure linear acceleration
- **Gyroscopes**: Measure angular velocity
- **IMUs**: Combine multiple sensors for full motion tracking

### Position Sensors
- **Encoders**: Measure rotational position of motors
- **Potentiometers**: Measure angular or linear position
- **GPS**: Provide global position information

## Sensor Characteristics

When selecting sensors for a robot, consider:

1. **Range**: What distances can the sensor measure?
2. **Resolution**: How detailed is the sensor's output?
3. **Accuracy**: How close is the measurement to the true value?
4. **Sampling Rate**: How frequently can the sensor take readings?
5. **Environmental Tolerance**: What conditions can the sensor operate in?`,
    urduContent: `# روبوٹ سینسرز کا جائزہ

سینسر روبوٹ کی آنکھیں، کان اور انگلیاں ہیں۔ یہ روبوٹ کو اپنے ماحول کو محسوس کرنے اور فیصلے کے لیے ضروری ڈیٹا اکٹھا کرنے دیتے ہیں۔

## روبوٹ سینسرز کی اقسام

### بصری سینسرز
- **کیمرے**: ماحول کی تصاویر اور ویڈیو پکڑتے ہیں۔
- **ڈیپتھ کیمرے**: رنگ اور گہرائی دونوں معلومات فراہم کرتے ہیں۔
- **لیڈار**: لیزر پلسس کا استعمال کرتے ہیں فاصلہ ناپنے اور 3D نقشے بنانے کے لیے۔

### پروکسمیٹی سینسرز
- **انفراریڈ**: جسمانی رابطے کے بغیر اشیاء کا پتہ لگاتے ہیں۔
- **الٹراسونک**: فاصلہ ناپنے کے لیے ساؤنڈ ویوز کا استعمال کرتے ہیں۔
- **ٹچ سینسرز**: جسمانی رابطے کا پتہ لگاتے ہیں۔

### اینرشل سینسرز
- **ایکسیلیرومیٹر**: لینیئر ایکسیلریشن ناپتے ہیں۔
- **جائروسکوپ**: اینگولر ویلاسٹی ناپتے ہیں۔
- **IMUs**: مکمل موشن ٹریکنگ کے لیے متعدد سینسرز کو ملاہوا ہے۔

### پوزیشن سینسرز
- **اینکوڈر**: موٹروں کی رotaتھنل پوزیشن ناپتے ہیں۔
- **پوٹینشیومیٹر**: اینگولر یا لینیئر پوزیشن ناپتے ہیں۔
- **GPS**: عالمی پوزیشن معلومات فراہم کرتے ہیں۔`,
  },
  {
    slug: 'week-02/module-01/camera-systems',
    title: 'Camera Systems',
    urduTitle: 'کیمرہ سسٹمز',
    content: `# Camera Systems

Cameras are one of the most important sensors for mobile robots, providing rich visual information about the environment.

## Types of Camera Systems

### Monocular Cameras
A single camera that captures 2D images. While simple, monocular cameras cannot directly measure depth.

**Advantages:**
- Low cost and power consumption
- Small and lightweight
- Well-understood algorithms for processing

**Limitations:**
- Cannot directly measure depth
- Scale ambiguity in structure from motion

### Stereo Cameras
Two or more cameras separated by a known distance, providing depth information through triangulation.

**Advantages:**
- Direct depth measurement
- Works in various lighting conditions
- Rich data for AI processing

**Limitations:**
- Higher cost than monocular
- Requires calibration and synchronization
- Limited effective range

### RGB-D Cameras
Combine RGB color images with depth information in a single device.

**Examples:**
- Microsoft Kinect
- Intel RealSense
- Orbbec Astra

**Advantages:**
- Color and depth in one package
- Active sensing (works in the dark)
- Fast depth acquisition

**Limitations:**
- Limited range (typically 0.5-5 meters)
- Issues with sunlight and reflective surfaces
- Higher power consumption`,
    urduContent: `# کیمرہ سسٹمز

کیمرے موبائل روبوٹس کے لیے سب سے اہم سینسرز میں سے ایک ہیں، جو ماحول کے بارے میں بصری معلومات فراہم کرتے ہیں۔

## کیمرہ سسٹمز کی اقسام

### مونوکیولر کیمرے
ایک کیمرا جو 2D تصاویر پکڑتا ہے۔ سادہ ہونے کے باوجود، یہ براہ راست گہرائی نہیں ناپ سکتا۔

**فوائد:**
- کم قوت اور بجلی کی کھپت
- چھوٹا اور ہلکا پھلکا
- پراسیسنگ کے لیے اچھی طرح سمجھے جانے والے الگورتھم

**حدود:**
- براہ راست گہرائی نہیں ناپ سکتا
- موشن سے ساخت میں پیمانے کی الجھن

### سٹیریو کیمرے
دو یا زیادہ کیمرے ایک جانے والے فاصلے پر الگ ہوتے ہیں، ٹرائینگولیشن کے ذریعے گہری معلومات فراہم کرتے ہیں۔

**فوائد:**
- براہ راست گہرائی کی پیمائش
- مختلف روشنی کی حالتوں میں کام کرتا ہے
- اے آئی پراسیسنگ کے لیے امیر ڈیٹا

### RGB-D کیمرے
RGB رنگین تصاویر کو ایک ہی آلات میں گہری معلومات کے ساتھ ملایا جاتا ہے۔

**مثالیں:**
- مائیکروسافٹ کینیکٹ
- انٹیل ریل سینس
- اوربیک ایسٹرا

**فوائد:**
- ایک پیکج میں رنگ اور گہرائی
- ایکٹو سینسنگ (اندھیرے میں کام کرتا ہے)
- تیز گہرائی حاصل کرنا`,
  },
  {
    slug: 'week-02/module-01/lidar-range-sensors',
    title: 'LiDAR and Range Sensors',
    urduTitle: 'لیڈار اور رینج سینسرز',
    content: `# LiDAR and Range Sensors

LiDAR (Light Detection and Ranging) is a remote sensing technology that uses laser light to measure distances and create precise 3D maps of the environment.

## How LiDAR Works

LiDAR works on a simple principle:

1. **Emit**: A laser pulse is fired toward a target
2. **Travel**: The pulse travels through the air at the speed of light
3. **Reflect**: The pulse bounces off the target and returns
4. **Detect**: The sensor measures the time of flight (ToF)
5. **Calculate**: Distance = (Speed of Light × Time) / 2

## Types of LiDAR

### Spinning LiDAR
Uses a rotating mirror or prism to scan the environment in 360 degrees.

**Characteristics:**
- 360-degree field of view
- High point cloud density
- Typically used in autonomous vehicles

### Solid-State LiDAR
No moving parts, using phased arrays or other techniques to steer the beam.

**Characteristics:**
- More reliable (no moving parts)
- Lower cost potential
- Limited field of view

### Flash LiDAR
Illuminates the entire scene at once and captures the reflected light with a sensor array.

**Characteristics:**
- Very fast (single capture)
- Good for close-range applications
- Lower resolution than scanning LiDAR

## Applications of LiDAR

- **Autonomous Vehicles**: Obstacle detection and localization
- **Mapping**: Creating detailed 3D maps of environments
- **Agriculture**: Crop monitoring and terrain analysis
- **Archaeology**: Discovering and mapping hidden structures`,
    urduContent: `# لیڈار اور رینج سینسرز

لیڈار (Light Detection and Ranging) ایک ریموٹ سینسنگ ٹیکنالوجی ہے جو لیزر لائٹ کا استعمال کرتی ہے فاصلے ناپنے اور ماحول کے درست 3D نقشے بنانے کے لیے۔

## لیڈار کیسے کام کرتا ہے

لیڈار ایک آسان اصول پر کام کرتا ہے:

1. **نکالنا**: ایک لیزر پلسس ٹارگیٹ کی طرف فائر کیا جاتا ہے
2. **سفر**: پلسس روشنی کی رفتار سے ہوا میں سفر کرتا ہے
3. **عکس**: پلسس ٹارگیٹ سے ٹکرانے کے واپس آتا ہے
4. **پتہ لگانا**: سینسر ٹائم آف فلائٹ (ToF) ماپتا ہے
5. **حساب**: فاصلہ = (روشنی کی رفتار × وقت) / 2

## لیڈار کی اقسام

### سپننگ لیڈار
ماحول میں 360 ڈگری اسکین کرنے کے لیے گھومتا ہوا شیشہ یا پرزم استعمال کرتا ہے

**خصوصیات:**
- 360 ڈگری فیلڈ آف ویو
- اعلی پوائنٹ کلاؤڈ کثافت
- عام طور پر خودکار گاڑیوں میں استعمال

### سالڈ اسٹیٹ لیڈار
کوئی حرکت پذیر حصے نہیں، بیم کو سیدھا کرنے کے لیے فیزڈ اریز یا دیگر تکنیکوں کا استعمال

**خصوصیات:**
- زیادہ قابل اعتماد
- کم لاگت کی صلاحیت
- محدود فیلڈ آف ویو

### فلیش لیڈار
پورے منظر کو ایک بار روشن کرتا ہے اور سینسر ارے کے ساتھ منعکس شدہ روشنی پکڑتا ہے

**خصوصیات:**
- بہت تیز (ایک کیپچر)
- قریبی فاصلے کے ایپلیکیشنز کے لیے اچھا
- سکیننگ لیڈار سے کم ریزولوشن`,
  },
  {
    slug: 'week-02/module-02/imu-proprioception',
    title: 'IMUs and Proprioceptive Sensing',
    urduTitle: 'IMUs اور پروپریوسیپٹو سینسنگ',
    content: `# IMUs and Proprioceptive Sensing

While cameras and LiDAR tell a robot about its environment, proprioceptive sensors tell the robot about itself—its own position, movement, and internal state. The most important proprioceptive sensor is the IMU (Inertial Measurement Unit), which measures acceleration and rotation.

## What is Proprioception?

In biology, proprioception is often called our "sixth sense"—the unconscious perception of movement and spatial orientation. For robots, proprioception serves the same essential function:

- **Position**: Where are my joints and limbs?
- **Velocity**: How fast am I moving?
- **Acceleration**: How is my motion changing?
- **Orientation**: Which way am I facing?

## The Inertial Measurement Unit (IMU)

An IMU is a compact electronic device that combines multiple inertial sensors to measure motion. Modern IMUs are found in smartphones, drones, vehicles, and nearly every mobile robot.

### Components of an IMU

| Component | What It Measures |
|-----------|-----------------|
| **Accelerometer** | Linear acceleration (m/s² or g) |
| **Gyroscope** | Angular velocity (rad/s or °/s) |
| **Magnetometer** | Magnetic field (optional, acts as compass) |

## How Accelerometers Work

Accelerometers measure **proper acceleration**—the acceleration felt by an object relative to freefall. A stationary accelerometer on your desk measures approximately 9.81 m/s² pointing upward because it measures the force required to keep it stationary.

## How Gyroscopes Work

Gyroscopes measure **angular velocity**—how fast something is rotating. Modern MEMS gyroscopes use vibrating structures that experience Coriolis forces when rotated.

### The Drift Problem

Gyroscope integration has a fatal flaw: **drift**. Small errors accumulate over time. A consumer-grade gyroscope might drift 1-10 degrees per minute.

## Sensor Fusion

Neither accelerometer nor gyroscope alone provides reliable orientation. The **complementary filter** combines both sensors:

**filtered_angle = α × (gyro_angle) + (1-α) × (accel_angle)**

Where α is typically 0.96-0.98. The gyroscope dominates short-term, while the accelerometer corrects long-term drift.`,
    urduContent: `# IMUs اور پروپریوسیپٹو سینسنگ

جب کیمرے اور لیڈار روبوٹ کو اس کے ماحول کے بارے میں بتاتے ہیں، تو پروپریوسیپٹو سینسرز روبوٹ کو خود کے بارے میں بتاتے ہیں۔ سب سے اہم پروپریوسیپٹو سینسر IMU (Inertial Measurement Unit) ہے۔

## پروپریوسیپٹن کیا ہے؟

حیات میں، پروپریوسیپٹن کو اکثر ہمارا "چھٹا حواس" کہا جاتا ہے۔ روبوٹس کے لیے، پروپریوسیپٹن ایک ہی اہم فنکشن پوری کرتا ہے:

- **پوزیشن**: میرے جوائنٹس اور اعضا کہاں ہیں؟
- **ویلاسٹی**: میں کتنی تیزی سے حرکت کر رہا ہوں؟
- **ایکسیلریشن**: میری حرکت کیسے تبدیل ہو رہی ہے؟
- **اورینٹیشن**: میں کس طرف موڑ رہا ہوں؟

## IMU کے اجزاء

| اجزاء | کیا ماپتا ہے |
|-------|-------------|
| **ایکسیلیرومیٹر** | لینیئر ایکسیلریشن |
| **جائروسکوپ** | اینگولر ویلاسٹی |
| **میگنیٹومیٹر** | مقناطیسی فیلڈ (اختیاری) |

## ایکسیلیرومیٹر کیسے کام کرتے ہیں

ایکسیلیرومیٹر **پراپر ایکسیلریشن** ماپتے ہیں۔ ایک ساکن ایکسیلیرومیٹر جو آپ کی میز پر پڑا ہے تقریباً 9.81 m/s² اوپر کی طرف ماپتا ہے۔

## جائروسکوپ کیسے کام کرتے ہیں

جائروسکوپ **اینگولر ویلاسٹی** ماپتے ہیں۔ جدید MEMS جائروسکوپ وائبریٹنگ سٹرکچر استعمال کرتے ہیں۔

### ڈریفٹ کا مسئلہ

جائروسکوپ انٹیگریشن میں ایک مہلک خامی ہے: **ڈریفٹ**۔ چھوٹی غلطیاں وقت کے ساتھ جمع ہو جاتی ہیں۔

## سینسر فیوژن

نہ تو ایکسیلیرومیٹر اور نہ ہی جائروسکوپ الگ الگ قابل اعتماد Orientaion فراہم کرتے۔ **کمپلیمنٹری فلٹر** دونوں سینسرز کو ملاتا ہے۔`,
  },
  {
    slug: 'week-02/module-02/sensor-fusion',
    title: 'Sensor Fusion and Kalman Filtering',
    urduTitle: 'سینسر فیوژن اور کالمن فلٹرنگ',
    content: `# Sensor Fusion and Kalman Filtering

Every sensor has limitations. GPS is accurate but updates slowly and fails indoors. IMUs respond quickly but drift over time. No single sensor can provide complete, reliable information about a robot's state.

**Sensor fusion** is the art and science of combining measurements from multiple sensors to produce estimates better than any sensor alone.

## Why Sensor Fusion?

Consider the sensors available to a typical mobile robot:

| Sensor | Strengths | Weaknesses |
|--------|-----------|------------|
| **GPS** | Absolute global position | Slow updates, no indoor coverage |
| **IMU** | Fast, smooth | Drifts over time |
| **Wheel Encoders** | Very precise short-term | Accumulated errors |
| **LiDAR** | Accurate distance | Computationally expensive |

## The Kalman Filter

The **Kalman filter** is the gold standard for sensor fusion. Developed by Rudolf Kalman in 1960, it's been used in nearly every navigation system since, from the Apollo spacecraft to your smartphone's GPS.

### Key Concepts

The Kalman filter maintains two pieces of information:

1. **State estimate (x̂)**: Our best guess of what we're trying to measure
2. **Error covariance (P)**: Our uncertainty about the estimate

The filter operates in two alternating steps:

1. **Predict**: Use a model of how the system evolves to project the estimate forward in time
2. **Update**: Incorporate a new measurement to improve the estimate

### The Kalman Gain

The key is the **Kalman gain (K)**, which determines how much to trust the measurement versus our prediction:

**K = predicted_uncertainty / (predicted_uncertainty + measurement_noise)**

- If measurement noise is low: K is large, we trust the measurement
- If measurement noise is high: K is small, we trust our prediction

## GPS + IMU Fusion

The combination of GPS and IMU is ubiquitous in robotics:

- **Between GPS updates**: The IMU provides smooth, high-rate position updates
- **Correcting IMU drift**: Each GPS update corrects accumulated IMU drift
- **Handling GPS outages**: The IMU continues providing position updates until GPS returns

## Key Takeaways

1. **Sensor fusion improves accuracy**: Combining sensors produces estimates better than any individual sensor.

2. **The Kalman filter is fundamental**: Its predict-update cycle forms the basis of most sensor fusion systems.

3. **GPS+IMU is a powerful combination**: Fast IMU updates plus slow GPS corrections is nearly universal in mobile robotics.`,
    urduContent: `# سینسر فیوژن اور کالمن فلٹرنگ

ہر سینسر کی اپنی حدیں ہیں۔ GPS درست ہے لیکن سستا ہے اور انڈور میں کام نہیں کرتا۔ IMUs تیز ہیں لیکن وقت کے ساتھ ڈریفٹ ہوتے ہیں۔ کوئی بھی ایک سینسر مکمل اور قابل اعتماد معلومات فراہم نہیں کر سکتا۔

**سینسر فیوڈنگ** ایک سائنس اور فن ہے جس میں متعدد سینسرز کی پیمائشوں کو ملا کر بہتر تخمینے پیدا کیے جاتے ہیں۔

## سینسر فیوڈن کیوں ضروری ہے؟

ایک عام موبائل روبوٹ کے لیے دستیاب سینسرز:

| سینسر | طاقتیں | کمزوریاں |
|-------|---------|----------|
| **GPS** | مکمل عالمی پوزیشن | سست، انڈور میں نہیں چلتا |
| **IMU** | تیز، ہموار | وقت کے ساتھ ڈریفٹ |
| **وہیل اینکوڈر** | بہت درست | جمع ہونے والی غلطیاں |
| **لیڈار** | درست فاصلہ | کمپیوٹیشنل مہنگا |

## کالمن فلٹر

**کالمن فلٹر** سینسر فیوڈنگ کا سنہرا معیار ہے۔ 1960 میں Rudolf Kalman نے تیار کیا، اور یہ ہر نیویگیشن سسٹم میں استعمال ہوتا ہے۔

### اہم تصورات

کالمن فلٹر دو چیزیں برقرار رکھتا ہے:

1. **ریاست کا تخمینہ (x̂)**: ہمارا بہترین اندازہ
2. **غلطی کوویرینس (P)**: ہمارا تخمینے کے بارے میں عدم یقین

فلٹر دو مراحل میں کام کرتا ہے:

1. **پیشین گوئی**: سسٹم کے برتاؤ کا ماڈل استعمال کریں
2. **اپ ڈیٹ**: تخمینے کو بہتر بنانے کے لیے نئی پیمائش شامل کریں

### کالمن گین

کلیدی ہے **کالمن گین (K)**، جو یہ طے کرتا ہے کہ پیمائش پر کتناعتماد کریں:

**K = پیشین عدم یقین / (پیشین عدم یقین + پیمائش شور)**

- اگر پیمائش کم ہو: K بڑا، ہم پیمائش پر اعتماد کرتے ہیں
- اگر پیمائش زیادہ ہو: K چھوٹا، ہم اپنی پیشین گوئی پر اعتماد کرتے ہیں

## GPS + IMU فیوڈنگ

GPS اور IMU کا امتزان روبوٹکس میں بہت عام ہے:

- **GPS اپڈیٹس کے درمیان**: IMU ہموار، تیز پوزیشن اپڈیٹ فراہم کرتا ہے
- **IMU ڈریفٹ درست کرنا**: ہر GPS اپڈیٹ IMU ڈریفٹ درست کرتا ہے
- **GPS آؤٹیج**: IMU جاری رہتا ہے جب تک GPS واپس نہ آئے`,
  },
  {
    slug: 'week-03/module-01/motor-control-basics',
    title: 'Motor Control Fundamentals',
    urduTitle: 'موٹر کنٹرول کی بنیادی باتیں',
    content: `# Motor Control Fundamentals

If sensors are a robot's eyes and ears, motors are its muscles. Every physical action a robot takes requires motors to convert electrical signals into physical motion.

## Types of Electric Motors

Electric motors are the most common actuators in robotics because they're efficient, controllable, and available in a wide range of sizes.

### DC Motors: Simple and Versatile

The **Direct Current (DC) motor** is the simplest type of electric motor. Apply voltage across its terminals, and it spins.

**Key Characteristics:**
- Simple control: Speed proportional to voltage
- Good torque at low speeds
- Bidirectional: Reverses by reversing voltage polarity

### Brushless DC Motors (BLDC): Efficient and Durable

**Brushless DC motors** eliminate the mechanical commutator and brushes, using electronic switching instead.

- Higher efficiency: 85-95%
- Longer lifespan: No brush wear
- Better power-to-weight ratio

### Servo Motors: Precision Positioning

A **servo motor** is a motor packaged with position feedback and a controller. When you command a position, the servo automatically moves to that position.

## The Fundamentals of Motor Control

### Open-Loop vs Closed-Loop Control

**Open-loop control** means sending a command without checking the result.

**Closed-loop control** means measuring the output and adjusting the input to correct errors.

Nearly all precision robotics uses closed-loop control.

### PID Control

**PID control** (Proportional-Integral-Derivative) is the most widely used feedback control algorithm.

**Output = Kp × error + Ki × ∫error dt + Kd × d(error)/dt**

Where Kp, Ki, and Kd are gains that determine how strongly each term influences the output.`,
    urduContent: `# موٹر کنٹرول کی بنیادی باتیں

اگر سینسر روبوٹ کی آنکھیں اور کان ہیں، تو موٹر اس کے پٹھے ہیں۔ روبوٹ کی ہر جسمانی حرکت کے لیے موٹر کی ضرورت ہوتی ہے۔

## برقی موٹر کی اقسام

برقی موٹر روبوٹکس میں سب سے عام ایکچویٹر ہیں۔

### DC موٹر: سادہ اور универсал

**Direct Current (DC) موٹر** سب سے آسان برقی موٹر ہے۔

**اہم خصوصیات:**
- سادہ کنٹرول: رفتار وولٹیج کے متناسب
- کم رفتار پر اچھا ٹارک
- دو طرفہ

### Brushless DC موٹر (BLDC): موثر اور پائیدار

- زیادہ موثریت: 85-95%
- لمبی عمر
- بہتر پاور-ٹو-ویٹ تناسب

### سervo موٹر: درست پوزیشننگ

**سervo موٹر** ایک موٹر ہے جس میں پوزیشن فیڈبیک اور کنٹرولر شامل ہوتا ہے۔

## موٹر کنٹرول کی بنیادی باتیں

### اوپن-لوپ بمقابلہ کلوزڈ-لوپ کنٹرول

**اوپن-لوپ کنٹرول**: نتیجہ چیکے بغیر کمانڈ بھیجنا۔

**کلوزڈ-لوپ کنٹرول**: آؤٹ پٹ ماپنا اور غلطیاں درست کرنا۔

### PID کنٹرول

**PID کنٹرول** سب سے زیادہ استعمال ہونے والا فیڈبیک کنٹرول الگورتھم ہے۔`,
  },
  {
    slug: 'week-03/module-01/trajectory-planning',
    title: 'Trajectory Planning and Motion Control',
    urduTitle: 'ٹریجیکٹری پلاننگ اور موشن کنٹرول',
    content: `# Trajectory Planning and Motion Control

Moving a robot from point A to point B seems simple, but doing it smoothly, efficiently, and safely requires careful planning. A jerky, abrupt motion can damage mechanisms and create safety hazards.

## What is a Trajectory?

A **trajectory** is more than just a path. While a path specifies the geometric route through space, a trajectory adds the dimension of time.

| Concept | What It Specifies |
|---------|-------------------|
| **Path** | Geometric route |
| **Trajectory** | Path + timing |

## Motion Profiles: The Heart of Trajectory Planning

### The Trapezoidal Velocity Profile

The most common motion profile is the **trapezoidal profile**:

1. **Acceleration phase**: Velocity ramps up at constant acceleration
2. **Cruise phase**: Velocity holds constant at maximum speed
3. **Deceleration phase**: Velocity ramps down to zero

### S-Curve Profiles: Even Smoother Motion

**S-curve profiles** limit jerk by smoothly ramping acceleration up and down.

**Benefits of S-curves:**
- Reduced mechanical vibration
- Lower acoustic noise
- Less wear on components

## Multi-Axis Coordination

Real robots have multiple joints or axes that must move together.

**Solution:** Identify the slowest axis and scale all other axes to match its timing.

## Trajectory Tracking Control

Planning a trajectory is only half the battle. The robot must actually follow it.

### Feedforward + Feedback Control

The most effective tracking controllers combine two strategies:

**Feedforward**: Use the planned trajectory to anticipate what control effort will be needed.

**Feedback**: Measure actual position and velocity, compute errors, and apply corrections.`,
    urduContent: `# ٹریجیکٹری پلاننگ اور موشن کنٹرول

روبوٹ کو پوائنٹ A سے پوائنٹ B تک منتقل کرنا آسان لگتا ہے، لیکن اسے ہموار، موثر اور محفوظ طریقے سے کرنے کے لیے غور سے پلاننگ کی ضرورت ہے۔

## ٹریجیکٹری کیا ہے؟

**ٹریجیکٹری** صرف ایک پاتھ نہیں ہے۔ جبکہ پاتھ جگہ کے ذریعے جائمان کا راستہ بتاتا ہے، ٹریجیکٹری وقت کا پیمانہ بھی شامل کرتا ہے۔

| تصور | کیا بتاتا ہے |
|------|-------------|
| **پاتھ** | جیومیٹرک راستہ |
| **ٹریجیکٹری** | پاتھ + ٹائمنگ |

## موشن پروفائلز: ٹریجیکٹری پلاننگ کا دل

### ٹریپیزائڈڈ ویلوسٹی پروفائل

سب سے عام موشن پروفائل **ٹریپیزائڈڈ پروفائل** ہے:

1. **ایکسیلریشن فیز**: رفتار مستقل ایکسیلریشن سے بڑھتی ہے
2. **کروز فیز**: رفتار زیادہ سے زیادہ رفتار پر مستقل رہتی ہے
3. **ڈیسیلریشن فیز**: رفتار صفر تک گرتی ہے

### S-کرمو پروفائلز: زیادہ ہموار موشن

**S-کرمو پروفائلز** جیرک کو محدود کرتے ہیں۔

**S-کرمو کے فوائد:**
- کم مکانیکل وائبریشن
- کم صوتی شور
- کم پرتوں کا نقصان

## ملٹی-ایکس کوآرڈینیشن

اصل روبوٹس میں متعدد جوائنٹس ہوتے ہیں جو ایک ساتھ حرکت کرنے چاہیئے۔

## ٹریجیکٹری ٹریکنگ کنٹرول

ٹریجیکٹری پلاننگ صرف آدھا کام ہے۔ روبوٹ کو اصل میں اس پر چلنا ہے۔

### فیڈ فورورڈ + فیڈ بیک کنٹرول

- **فیڈ فورورڈ**: پلان کیا گیا ٹریجیکٹری استعمال کریں۔
- **فیڈ بیک**: اصل پوزیشن اور رفتار ماپیں، غلطیاں درست کریں۔`,
  },
  {
    slug: 'week-03/module-02/robot-kinematics',
    title: 'Robot Kinematics',
    urduTitle: 'روبوٹ کائنیٹکس',
    content: `# Robot Kinematics

Kinematics is the study of motion without considering forces. For robot arms, kinematics answers two fundamental questions:

- **Forward kinematics**: Given joint angles, where is the end-effector?
- **Inverse kinematics**: Given a desired end-effector position, what joint angles achieve it?

## The Kinematic Challenge

Consider a robot arm reaching for a cup. You know where the cup is, but the robot's motors control joint angles. How do you translate coordinates into joint angles?

This translation—from task space to joint space—is the core kinematic problem.

## Coordinate Frames and Transformations

A robot arm has many parts, each with its own local reference frame:
- The base frame
- Each link has its own frame
- The end-effector frame

### The DH Convention

The **Denavit-Hartenberg (DH) convention** provides a standardized way to define link transformations using four parameters per joint:

| Parameter | Meaning |
|-----------|---------|
| **Link length** | a | Distance along the common normal |
| **Link twist** | α | Angle between joint axes |
| **Link offset** | d | Distance along joint axis |
| **Joint angle** | θ | Rotation about joint axis |

## Forward Kinematics

Forward kinematics is the "easy" direction: given joint angles, find end-effector position.

For any robot arm:
1. Define DH parameters for each joint
2. Compute transformation matrix for each joint
3. Multiply all matrices together
4. Extract position from result

The result is always unique.

## Inverse Kinematics

Inverse kinematics (IK) is the "hard" direction: given desired end-effector pose, find joint angles.

### Why IK is Hard

**Multiple solutions**: Many joint configurations can reach the same position.

**No solutions**: Some positions are unreachable.

**Singularities**: At certain configurations, the robot loses degrees of freedom.`,
    urduContent: `# روبوٹ کائنیٹکس

کائنیٹکس قوتوں پر غور کیے بغیر حرکت کا مطالعہ ہے۔ روبوٹ آرموں کے لیے، کائنیٹکس دو بنیادی سوالات کا جواب دیتا ہے:

- **فارورڈ کائنیٹکس**: جوائنٹ زاویے دیئے، اینڈ ایفیکٹر کہاں ہے؟
- **انورس کائنیٹکس**: مطلوبہ پوزیشن دی، کون سے زاویے؟

## کائنیٹک چیلنج

ایک روبوٹ آرم کی طرف سے کپ تک پہنچنے کی تصویر بنائیں۔ آپ جانتے ہیں کہ کپ کہاں ہے، لیکن موٹر جوائنٹ زاویوں کو کنٹرول کرتے ہیں۔

یہ ترجمہ کور کائنیٹک پرابلم ہے۔

## کوآرڈینیٹ فریمز اور ٹرانسفارمیشنز

ایک روبوٹ آرم کے کئی حصے ہیں، ہر ایک اپنے فریم کے ساتھ:
- بیس فریم
- ہر لنک کا فریم
- اینڈ ایفیکٹر فریم

### DH کنونشن

**Denavit-Hartenberg (DH) کنونشن** ہر جوائنٹ کے لیے چار پیرامیٹرز استعمال کرتا ہے:

| پیرامیٹر | معنی |
|---------|---------|
| **لنک لمبائی** | جوائنٹ ایکسز کے درمیان فاصلہ |
| **لنک ٹوئسٹ** | جوائنٹ ایکسز کے درمیان زاویہ |
| **لنک آفسیٹ** | جوائنٹ ایکس کے ساتھ فاصلہ |
| **جوائنٹ زاویہ** | جوائنٹ ایکس کے گرد گردش |

## فارورڈ کائنیٹکس

فارورڈ کائنیٹکس "آسان" سمت ہے: جوائنٹ زاویے دیئے، پوزیشن تلاش کریں۔

نتیجہ ہمیشہ منفرد ہوتا ہے۔

## انورس کائنیٹکس

انورس کائنیٹکس "مشکل" سمت ہے: مطلوبہ پوزیشن دی، زاویے تلاش کریں۔

### IK کیوں مشکل ہے

**متعدد حل**: ایک ہی پوزیشن تک بہت سے زاویے۔

**کوئی حل نہیں**: کچھ پوزیشنیں پہنچ سے باہر۔

**سنگولیریٹیز**: کچھ کانفگریشنز میں ڈگری آف فریڈم کھو جاتا ہے۔`,
  },
  {
    slug: 'week-04/module-01/ros-introduction',
    title: 'Introduction to ROS',
    urduTitle: 'ROS کا تعارف',
    content: `# Introduction to ROS

The Robot Operating System (ROS) isn't actually an operating system—it's a flexible framework for writing robot software. ROS provides tools, libraries, and conventions that simplify creating complex robot behaviors.

## What is ROS?

ROS is **middleware**—software that sits between the operating system and your application code. It provides:

- **Communication infrastructure**: Standardized message passing between processes
- **Hardware abstraction**: Common interfaces for sensors and actuators
- **Device drivers**: Ready-to-use drivers for cameras, LiDARs, motors
- **Visualization tools**: See what your robot sees in 3D
- **Package management**: Share and reuse code

## Core ROS Concepts

### Nodes

A **node** is a process that performs computation. A typical robot system comprises many nodes:
- Camera driver node: Captures images
- Object detector node: Processes images
- Motion planner node: Plans collision-free paths
- Motor controller node: Sends commands to actuators

### Topics: Publish/Subscribe Communication

**Topics** are named channels for message passing. Nodes can publish or subscribe.

This is asynchronous, many-to-many communication.

### Services: Request/Response Communication

**Services** provide synchronous request/response communication—like calling a function.

## The ROS Ecosystem

### Packages

ROS organizes code into **packages**—the basic unit of organization. A package contains:
- Node executables
- Libraries
- Configuration files
- Launch files

### Tools

**RViz**: 3D visualization

**Gazebo**: Physics-based simulator

**rqt**: GUI tools

## Key Takeaways

1. **ROS is middleware**: It provides communication and tools.

2. **Nodes are modular processes**: Each handles a specific function.

3. **Topics enable publish/subscribe**: Asynchronous communication for data streams.

4. **Services provide request/response**: Synchronous communication for commands.

5. **The ecosystem is vast**: Thousands of packages solve common robotics problems.`,
    urduContent: `# ROS کا تعارف

Robot Operating System (ROS) دراصل ایک آپریٹنگ سسٹم نہیں ہے — یہ روبوٹ سافٹویئر لکھنے کے لیے ایک لچکدار فریم ورک ہے۔ ROS ٹولز، لائبریریز اور کنونشنز فراہم کرتا ہے۔

## ROS کیا ہے؟

ROS **مڈل ویئر** ہے — سافٹ ویئر جو آپریٹنگ سسٹم اور آپ کی ایپلیکیشن کوڈ کے درمیان بیٹھتا ہے۔ یہ فراہم کرتا ہے:

- **کمیونیکیشن انفراسٹرکچر**: پیغام پاسنگ
- **ہارڈویئر ابstraction**: سینسرز اور ایکچویٹرز کے لیے انٹرفیس
- **ڈیوائس ڈرائیورز**: کیمرے، لیڈارز، موٹرز کے لیے
- **ویزولائزیشن ٹولز**: 3D دیکھیں
- **پیکیج مینجمنٹ**: کوڈ شیئر اور دوبارہ استعمال

## ROS کور کونسبٹس

### نوڈس

**نوڈ** ایک پروسیس ہے جو کمپیوٹیشن انجام دیتا ہے۔ ایک عام روبوٹ سسٹم میں بہت سے نوڈس ہوتے ہیں۔

### ٹاپکس: پبلش/سبسکرائب کمیونیکیشن

**ٹاپکس** پیغام پاسنگ کے لیے نامی چینلز ہیں۔ یہ غیر متزامن، بہت سے سے بہت سے کمیونیکیشن ہے۔

### سروسز: ریکویسٹ/ریسپانس کمیونیکیشن

**سروسز** متزامن ریکویسٹ/ریسپانس کمیونیکیشن فراہم کرتی ہیں۔

## ROS ایکوسسٹم

### پیکیجز

ROS کوڈ کو **پیکیجز** میں منظم کرتا ہے — تنظیم کی بنیادی اکائی۔

### ٹولز

**RViz**: 3D ویزولائزیشن

**Gazebo**: فزکس-بیسڈ سیمولیٹر

**rqt**: GUI ٹولز

## اہم نتائج

1. **ROS مڈل ویئر ہے**: کمیونیکیشن اور ٹولز فراہم کرتا ہے۔

2. **نوڈس ماڈیولر پروسیسیز ہیں**: ہر ایک ایک مخصوص فنکشن سنبھالتا ہے۔

3. **ٹاپکس پبلش/سبسکرائب کو اینیبل کرتے ہیں**: ڈیٹا سٹریمز کے لیے۔

4. **سروسز ریکویسٹ/ریسپانس فراہم کرتی ہیں**: کمانڈز کے لیے۔

5. **ایکوسسٹم بہت وسیع ہے**: ہزاروں پیکیجز۔`,
  },
];

export function getTranslation(slug: string): Translation | undefined {
  return translations.find(t => t.slug === slug);
}

export function getAllSlugs(): string[] {
  return translations.map(t => t.slug);
}
