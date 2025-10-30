type CardProps = {
  title?: string;
  children: React.ReactNode;
  className?: string;
};

const Card = ({ title, children, className = "" }: CardProps) => {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition duration-300 ${className}`}>
      {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
      <div className="text-gray-700">{children}</div>
    </div>
  );
};

export default Card;
