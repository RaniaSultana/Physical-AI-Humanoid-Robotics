/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  courseSidebar: [
    'index',
    {
      type: 'category',
      label: 'Week 1: Foundations of Physical AI',
      collapsible: true,
      collapsed: false,
      items: [
        {
          type: 'category',
          label: 'Module 1: Introduction to Physical AI',
          items: [
            'week-01/module-01/introduction',
            'week-01/module-01/embodied-ai',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 2: Sensors & Perception',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Robot Sensors',
          items: [
            'week-02/module-01/sensors-overview',
            'week-02/module-01/camera-systems',
            'week-02/module-01/lidar-range-sensors',
          ],
        },
        {
          type: 'category',
          label: 'Module 2: Proprioception & Fusion',
          items: [
            'week-02/module-02/imu-proprioception',
            'week-02/module-02/sensor-fusion',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 3: Motor Control & Kinematics',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Motor Control',
          items: [
            'week-03/module-01/motor-control-basics',
            'week-03/module-01/trajectory-planning',
          ],
        },
        {
          type: 'category',
          label: 'Module 2: Robot Kinematics',
          items: [
            'week-03/module-02/robot-kinematics',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 4: Robot Operating System (ROS)',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: ROS Fundamentals',
          items: [
            'week-04/module-01/ros-introduction',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 5: Machine Learning for Robotics',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: ML Foundations',
          items: [
            'week-05/module-01/ml-for-robotics',
            'week-05/module-01/deep-rl-robotics',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 6: Deep Learning for Robotics',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Neural Networks',
          items: [
            'week-06/module-01/neural-network-architectures',
            'week-06/module-01/transfer-learning',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 7: Robot Simulation',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Simulation Environments',
          items: [
            'week-07/module-01/robot-simulation',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 8: Sim-to-Real Transfer',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Bridging the Gap',
          items: [
            'week-08/module-01/sim-to-real',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 9: Humanoid Robotics',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Humanoid Fundamentals',
          items: [
            'week-09/module-01/humanoid-fundamentals',
            'week-09/module-01/bipedal-locomotion',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 10: Manipulation & HRI',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Manipulation & Interaction',
          items: [
            'week-10/module-01/humanoid-manipulation',
            'week-10/module-01/human-robot-interaction',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 11: Multi-Robot Systems & Ethics',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Advanced Topics',
          items: [
            'week-11/module-01/multi-robot-systems',
            'week-11/module-01/ethics-safety',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Week 12: Future of Robotics',
      collapsible: true,
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Module 1: Looking Ahead',
          items: [
            'week-12/module-01/future-robotics',
          ],
        },
      ],
    },
  ],
};

module.exports = sidebars;
