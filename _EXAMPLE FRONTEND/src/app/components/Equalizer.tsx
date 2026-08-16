import { motion } from 'motion/react';
import { Flex } from 'antd';

interface EqualizerProps {
  className?: string;
}

export function Equalizer({ className = '' }: EqualizerProps) {
  const bars = [0.6, 1, 0.8, 0.4];
  
  return (
    <Flex align="flex-end" gap={2} style={{ height: '12px' }} className={className}>
      {bars.map((height, idx) => (
        <motion.div
          key={idx}
          style={{
            width: '2px',
            background: '#38BDF8',
            borderRadius: '9999px'
          }}
          animate={{
            height: [`${height * 100}%`, '100%', `${height * 100}%`],
          }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: idx * 0.1,
          }}
        />
      ))}
    </Flex>
  );
}
